/**
 * ADMIN BORROWING CONTROLLER
 *
 * Gives admins full visibility and control over the library's lending records.
 *
 * ROUTES HANDLED (all require admin JWT):
 *   GET  /api/admin/borrowings              → getAllBorrowings
 *   POST /api/admin/borrowings/issue        → issueBorrow
 *   PUT  /api/admin/borrowings/:id/return   → adminMarkReturned
 *   GET  /api/admin/members                 → getMembers
 *   GET  /api/admin/available-books         → getAvailableBooks
 *
 * KEY DIFFERENCE FROM MEMBER BORROWING:
 *   - Admin can issue a book TO any member (not just themselves)
 *   - Admin can return any borrowing (no userId ownership check)
 *   - Admin can see ALL library borrowings, not just their own
 *   - Admin can set a custom due date when issuing
 */

const { Op } = require("sequelize");
const User     = require("../models/User");
const Book     = require("../models/Book");
const Borrowing = require("../models/Borrowing");

/**
 * Builds a full URL for a book cover image.
 * @param {object} req      - Express request (provides protocol + host)
 * @param {string} filename - Filename stored in DB
 * @returns {string|null}
 */
function buildCoverImageUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/books/${filename}`;
}

/**
 * Returns true if a borrowing is past its due date and not yet returned.
 * @param {object} b - Borrowing instance
 * @returns {boolean}
 */
function isOverdue(b) {
  return b.status === "borrowed" && b.dueDate && new Date(b.dueDate) < new Date();
}


// =============================================================================
// GET ALL BORROWINGS
// Route: GET /api/admin/borrowings
// Query params:
//   ?page=1         — pagination
//   ?limit=15
//   ?status=all|borrowed|returned|overdue
//   ?search=text    — searches member name, email, or book title
// =============================================================================

/**
 * GET ALL BORROWINGS
 *
 * Returns every borrowing record in the library with member + book details.
 * Supports pagination, status filtering, and full-text search.
 *
 * Each record includes an "isOverdue" boolean the frontend uses to
 * highlight overdue rows in red.
 *
 * @param {object} req
 * @param {object} res
 */
const getAllBorrowings = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const status = req.query.status  || "all";   // all | borrowed | returned | overdue
    const search = req.query.search  || "";

    // ── Build the WHERE clause for Borrowing ────────────────────────────────
    const borrowingWhere = {};

    if (status === "borrowed" || status === "returned") {
      borrowingWhere.status = status;
    }

    if (status === "overdue") {
      // Overdue = currently borrowed AND past due date
      borrowingWhere.status  = "borrowed";
      borrowingWhere.dueDate = { [Op.lt]: new Date() };
    }

    // ── Build search on User (name/email) and Book (title) ─────────────────
    const userWhere = {};
    const bookWhere = {};

    if (search) {
      userWhere[Op.or] = [
        { name:  { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
      bookWhere.title = { [Op.iLike]: `%${search}%` };
    }

    // ── Query ───────────────────────────────────────────────────────────────
    const { count, rows } = await Borrowing.findAndCountAll({
      where: borrowingWhere,
      include: [
        {
          model:      User,
          as:         "user",
          attributes: ["id", "name", "email"],
          // When searching, only include borrowings whose member matches OR book matches
          // We use "required: false" + post-filter to avoid complex cross-association queries
          where:      search ? userWhere : undefined,
          required:   !!search, // if no search, include all; if searching user, require match
        },
        {
          model:      Book,
          as:         "book",
          attributes: ["id", "title", "author", "genre", "isbn", "coverImage"],
        },
      ],
      order:  [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true, // prevents count inflation from the JOIN
    });

    // If searching, also find borrowings where the BOOK title matches
    // (since above only searched on user). We do a separate OR-style merge.
    let finalRows  = rows;
    let finalCount = count;

    if (search) {
      // Fetch borrowings matched by book title
      const bookMatches = await Borrowing.findAll({
        where: borrowingWhere,
        include: [
          {
            model:      User,
            as:         "user",
            attributes: ["id", "name", "email"],
          },
          {
            model:      Book,
            as:         "book",
            attributes: ["id", "title", "author", "genre", "isbn", "coverImage"],
            where:      bookWhere,
            required:   true,
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Merge user-match rows and book-match rows, removing duplicates by id
      const merged = [...rows];
      const existingIds = new Set(rows.map(function (r) { return r.id; }));
      bookMatches.forEach(function (b) {
        if (!existingIds.has(b.id)) merged.push(b);
      });

      // Sort merged by createdAt DESC and paginate
      merged.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      finalCount = merged.length;
      finalRows  = merged.slice(offset, offset + limit);
    }

    // ── Format response ──────────────────────────────────────────────────────
    const borrowings = finalRows.map(function (b) {
      const overdue = isOverdue(b);
      return {
        id:         b.id,
        status:     b.status,
        isOverdue:  overdue,
        dueDate:    b.dueDate,
        returnedAt: b.returnedAt,
        borrowedAt: b.createdAt,
        member: b.user
          ? { id: b.user.id, name: b.user.name, email: b.user.email }
          : null,
        book: b.book
          ? {
              id:            b.book.id,
              title:         b.book.title,
              author:        b.book.author,
              genre:         b.book.genre,
              isbn:          b.book.isbn,
              coverImageUrl: buildCoverImageUrl(req, b.book.coverImage),
            }
          : null,
      };
    });

    const totalPages = Math.ceil(finalCount / limit);

    // ── Overdue count (for the stats card, always calculated) ───────────────
    const overdueCount = await Borrowing.count({
      where: { status: "borrowed", dueDate: { [Op.lt]: new Date() } },
    });

    return res.status(200).json({
      message: "Borrowings retrieved successfully.",
      pagination: {
        currentPage:    page,
        totalPages,
        totalBorrowings: finalCount,
        limit,
        hasNextPage:     page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats: { overdueCount },
      borrowings,
    });

  } catch (error) {
    console.error("getAllBorrowings error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve borrowings.", error: error.message });
  }
};


// =============================================================================
// ISSUE BORROW (Admin)
// Route: POST /api/admin/borrowings/issue
// Body: { userId, bookId, dueDate? }
// =============================================================================

/**
 * ISSUE BORROW
 *
 * An admin issues a specific book to a specific member.
 * The admin can optionally set a custom due date (otherwise defaults to +14 days).
 *
 * Business rules — same as member self-borrow:
 *   - Book must have availableCopies > 0
 *   - Member must not already have this book borrowed
 *
 * @param {object} req - req.body: { userId, bookId, dueDate? }
 * @param {object} res
 */
const issueBorrow = async (req, res) => {
  try {
    const { userId, bookId, dueDate: rawDueDate } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ message: "userId and bookId are required." });
    }

    // Verify the member exists and has the "member" role
    const member = await User.findOne({ where: { id: userId, role: "member" } });
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    // Verify the book exists and has copies
    const book = await Book.findByPk(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }
    if (book.availableCopies < 1) {
      return res.status(400).json({ message: `No copies of "${book.title}" are available.` });
    }

    // Check for existing active borrow
    const existing = await Borrowing.findOne({
      where: { userId, bookId, status: "borrowed" },
    });
    if (existing) {
      return res.status(409).json({
        message: `${member.name} already has "${book.title}" borrowed.`,
      });
    }

    // Calculate due date
    let dueDate;
    if (rawDueDate) {
      dueDate = new Date(rawDueDate);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({ message: "Invalid dueDate format. Use YYYY-MM-DD." });
      }
    } else {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
    }

    // Create borrowing record and decrement copy count
    const borrowing = await Borrowing.create({ userId, bookId, status: "borrowed", dueDate });
    await book.update({ availableCopies: book.availableCopies - 1 });

    return res.status(201).json({
      message: `"${book.title}" issued to ${member.name}. Due by ${dueDate.toDateString()}.`,
      borrowing: {
        id:         borrowing.id,
        userId:     borrowing.userId,
        bookId:     borrowing.bookId,
        memberName: member.name,
        bookTitle:  book.title,
        status:     borrowing.status,
        dueDate:    borrowing.dueDate,
        borrowedAt: borrowing.createdAt,
      },
    });

  } catch (error) {
    console.error("issueBorrow error:", error.message);
    return res.status(500).json({ message: "Failed to issue book.", error: error.message });
  }
};


// =============================================================================
// ADMIN MARK RETURNED
// Route: PUT /api/admin/borrowings/:id/return
// =============================================================================

/**
 * ADMIN MARK RETURNED
 *
 * Marks ANY borrowing as returned (admin does not need to own it).
 * Used when a member hands the book back to the desk.
 *
 * @param {object} req - req.params.id = borrowing ID
 * @param {object} res
 */
const adminMarkReturned = async (req, res) => {
  try {
    const borrowing = await Borrowing.findByPk(req.params.id);

    if (!borrowing) {
      return res.status(404).json({ message: "Borrowing record not found." });
    }

    if (borrowing.status === "returned") {
      return res.status(400).json({ message: "This book has already been returned." });
    }

    await borrowing.update({ status: "returned", returnedAt: new Date() });

    const book = await Book.findByPk(borrowing.bookId);
    if (book) {
      await book.update({ availableCopies: book.availableCopies + 1 });
    }

    return res.status(200).json({
      message: "Book marked as returned successfully.",
      borrowing: {
        id:         borrowing.id,
        status:     borrowing.status,
        returnedAt: borrowing.returnedAt,
      },
    });

  } catch (error) {
    console.error("adminMarkReturned error:", error.message);
    return res.status(500).json({ message: "Failed to mark book as returned.", error: error.message });
  }
};


// =============================================================================
// GET MEMBERS (for issue-book dropdown)
// Route: GET /api/admin/members
// =============================================================================

/**
 * GET MEMBERS
 *
 * Returns all users with role = "member" for the "Issue Book" dropdown.
 * Only returns id, name, and email — no passwords.
 *
 * @param {object} req
 * @param {object} res
 */
const getMembers = async (req, res) => {
  try {
    const members = await User.findAll({
      where:      { role: "member" },
      attributes: ["id", "name", "email"],
      order:      [["name", "ASC"]],
    });

    return res.status(200).json({
      message: "Members retrieved successfully.",
      members,
    });

  } catch (error) {
    console.error("getMembers error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve members.", error: error.message });
  }
};


// =============================================================================
// GET AVAILABLE BOOKS (for issue-book dropdown)
// Route: GET /api/admin/available-books
// =============================================================================

/**
 * GET AVAILABLE BOOKS
 *
 * Returns books that have at least 1 available copy, for the admin
 * "Issue Book" form's book dropdown.
 *
 * @param {object} req
 * @param {object} res
 */
const getAvailableBooks = async (req, res) => {
  try {
    const books = await Book.findAll({
      where:      { availableCopies: { [Op.gt]: 0 } },
      attributes: ["id", "title", "author", "availableCopies"],
      order:      [["title", "ASC"]],
    });

    return res.status(200).json({
      message: "Available books retrieved successfully.",
      books,
    });

  } catch (error) {
    console.error("getAvailableBooks error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve available books.", error: error.message });
  }
};


module.exports = {
  getAllBorrowings,
  issueBorrow,
  adminMarkReturned,
  getMembers,
  getAvailableBooks,
};
