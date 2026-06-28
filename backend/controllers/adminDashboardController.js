/**
 * ADMIN DASHBOARD CONTROLLER
 *
 * Handles: GET /api/admin/dashboard
 *
 * Returns all the data the Admin Dashboard page needs in a single API call:
 *
 *   stats         → 4 summary numbers (total books, members, active loans, overdue)
 *   recentBooks   → the 5 most recently added books (newest first)
 *   recentBorrows → the 5 most recent borrowing records (newest first)
 *
 * This replaces the old inline route handler that only returned a plain message.
 */

const { Op } = require("sequelize"); // Op gives us operators like "less than" for WHERE clauses

const Book      = require("../models/Book");
const User      = require("../models/User");
const Borrowing = require("../models/Borrowing");

/**
 * Builds the full URL for a book cover image from just the stored filename.
 *
 * WHY: We only store the filename in the database (e.g. "book-123.jpg").
 * The frontend needs the complete URL (e.g. "http://localhost:5000/uploads/books/book-123.jpg").
 *
 * @param {object} req      - Express request object (gives us the server hostname)
 * @param {string} filename - The filename stored in the Book record
 * @returns {string|null}   - Full URL, or null if there is no cover image
 */
function buildCoverUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/books/${filename}`;
}

/**
 * GET /api/admin/dashboard
 *
 * Fetches all stats and recent activity for the admin dashboard page.
 *
 * Step by step:
 *  1. Count total books in the catalog
 *  2. Count total registered members (users with role = "member")
 *  3. Count active loans (borrowings with status = "borrowed")
 *  4. Count overdue loans (borrowed AND dueDate is in the past)
 *  5. Get the 5 most recently added books
 *  6. Get the 5 most recent borrowing records with member + book details
 *
 * We run steps 1-4 in parallel using Promise.all() for speed.
 */
const getAdminDashboard = async (req, res) => {
  try {

    // ── Step 1-4: Count stats (run all four at the same time for speed) ──────
    //
    // Promise.all() waits for ALL promises inside the array to finish,
    // then gives us all results at once. This is faster than awaiting them one
    // by one because the database can work on all four queries simultaneously.

    const now = new Date(); // current date/time — used to detect overdue loans

    const [totalBooks, totalMembers, activeLoans, overdueLoans] = await Promise.all([

      // Count every book in the catalog (regardless of availability)
      Book.count(),

      // Count every user who has the "member" role
      // Admins are excluded because they are not library members
      User.count({
        where: { role: "member" },
      }),

      // Count borrowing records where status is still "borrowed"
      // (the member has not returned the book yet)
      Borrowing.count({
        where: { status: "borrowed" },
      }),

      // Count borrowing records that are BOTH:
      //   - still "borrowed" (not returned yet)
      //   - past their due date (dueDate is before right now)
      // Op.lt means "less than" — dueDate < now
      Borrowing.count({
        where: {
          status: "borrowed",
          dueDate: { [Op.lt]: now },
        },
      }),

    ]);

    // ── Step 5: Get the 5 most recently added books ──────────────────────────
    //
    // ORDER BY createdAt DESC → newest books first
    // LIMIT 5 → only the 5 most recent

    const recentBooksRaw = await Book.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    // Build the cover image URL for each book before sending to the frontend
    const recentBooks = recentBooksRaw.map(function (book) {
      return {
        id:             book.id,
        title:          book.title,
        author:         book.author,
        genre:          book.genre,
        availableCopies: book.availableCopies,
        totalCopies:    book.totalCopies,
        coverImageUrl:  buildCoverUrl(req, book.coverImage),
        addedOn:        book.createdAt,
      };
    });

    // ── Step 6: Get the 5 most recent borrowings (with member + book details) ─
    //
    // We "include" the User (member) and Book models so Sequelize does a JOIN
    // and attaches the member and book data to each borrowing record.
    // The "as" aliases match the associations defined in server.js.

    const recentBorrowsRaw = await Borrowing.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: User,
          as: "user", // matches: Borrowing.belongsTo(User, { as: "user" }) in server.js
          attributes: ["id", "name", "email"], // only fetch these columns from Users table
        },
        {
          model: Book,
          as: "book", // matches: Borrowing.belongsTo(Book, { as: "book" }) in server.js
          attributes: ["id", "title", "author", "coverImage"],
        },
      ],
    });

    // Shape the borrowing records for the frontend
    const recentBorrows = recentBorrowsRaw.map(function (b) {
      return {
        id:         b.id,
        status:     b.status,
        dueDate:    b.dueDate,
        returnedAt: b.returnedAt,
        borrowedOn: b.createdAt,
        // Is this loan past its due date and still not returned?
        isOverdue:  b.status === "borrowed" && b.dueDate && new Date(b.dueDate) < now,
        // Member who borrowed the book
        member: {
          id:    b.user ? b.user.id    : null,
          name:  b.user ? b.user.name  : "Unknown",
          email: b.user ? b.user.email : "",
        },
        // The borrowed book
        book: {
          id:           b.book ? b.book.id          : null,
          title:        b.book ? b.book.title        : "Unknown",
          author:       b.book ? b.book.author       : "",
          coverImageUrl: buildCoverUrl(req, b.book ? b.book.coverImage : null),
        },
      };
    });

    // ── Send the complete dashboard response ─────────────────────────────────
    return res.status(200).json({
      stats: {
        totalBooks,
        totalMembers,
        activeLoans,
        overdueLoans,
      },
      recentBooks,
      recentBorrows,
    });

  } catch (error) {
    console.error("Admin dashboard error:", error.message);
    return res.status(500).json({
      message: "Failed to load admin dashboard data.",
      error: error.message,
    });
  }
};

module.exports = { getAdminDashboard };
