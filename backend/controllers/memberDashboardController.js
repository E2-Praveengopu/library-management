/**
 * MEMBER DASHBOARD CONTROLLER
 *
 * Handles: GET /api/member/dashboard
 *
 * Returns everything the Member Dashboard page needs in a single API call:
 *
 *   stats       → 4 numbers (total borrowed, currently reading, returned, overdue)
 *   activeLoans → books the member currently has (not yet returned), with due dates
 *   history     → last 5 books the member has already returned
 *
 * The member's ID comes from req.user.id (set by the verifyToken middleware
 * after checking the JWT token in the Authorization header).
 */

const { Op } = require("sequelize");

const Book      = require("../models/Book");
const Borrowing = require("../models/Borrowing");

/**
 * Builds the full URL for a book's cover image.
 *
 * @param {object} req      - Express request object
 * @param {string} filename - Filename stored in the database
 * @returns {string|null}
 */
function buildCoverUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/books/${filename}`;
}

/**
 * GET /api/member/dashboard
 *
 * Fetches the logged-in member's dashboard data.
 *
 * Step by step:
 *  1. Get all borrowings for this member, joined with the book info
 *  2. Split them into "active" (status = "borrowed") and "history" (status = "returned")
 *  3. For active loans, calculate if each one is overdue (dueDate < today)
 *  4. Calculate 4 summary stats
 *  5. Return everything in one response
 */
const getMemberDashboard = async (req, res) => {
  try {

    // req.user.id is the logged-in member's ID.
    // The verifyToken middleware decodes the JWT and puts the user info on req.user.
    const memberId = req.user.id;

    const now = new Date();

    // ── Step 1: Get ALL borrowings for this member, with book details ─────────
    //
    // We include the Book model so each borrowing record also contains
    // the book's title, author, genre, and cover image filename.
    //
    // ORDER BY createdAt DESC → most recent first
    // (no LIMIT here — we want all records to calculate stats accurately)

    const allBorrowings = await Borrowing.findAll({
      where: { userId: memberId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Book,
          as: "book", // matches: Borrowing.belongsTo(Book, { as: "book" }) in server.js
          attributes: ["id", "title", "author", "genre", "coverImage"],
        },
      ],
    });

    // ── Step 2: Split into active loans and history ──────────────────────────
    //
    // active loans: books the member currently holds (not returned yet)
    // history:      books the member has already returned (last 5)

    const activeLoans  = [];
    const historyItems = [];

    for (const b of allBorrowings) {
      const isOverdue = b.status === "borrowed" && b.dueDate && new Date(b.dueDate) < now;

      const borrowRecord = {
        id:         b.id,
        status:     b.status,
        dueDate:    b.dueDate,
        returnedAt: b.returnedAt,
        borrowedOn: b.createdAt,
        isOverdue,
        book: {
          id:           b.book ? b.book.id     : null,
          title:        b.book ? b.book.title  : "Unknown",
          author:       b.book ? b.book.author : "",
          genre:        b.book ? b.book.genre  : "",
          coverImageUrl: buildCoverUrl(req, b.book ? b.book.coverImage : null),
        },
      };

      if (b.status === "borrowed") {
        activeLoans.push(borrowRecord);
      } else {
        historyItems.push(borrowRecord);
      }
    }

    // ── Step 3: Calculate stats ───────────────────────────────────────────────

    const overdueCount = activeLoans.filter(function (b) { return b.isOverdue; }).length;

    const stats = {
      totalBorrowed: allBorrowings.length,          // every book ever borrowed
      activeBorrows: activeLoans.length,            // currently holding
      returned:      historyItems.length,           // already returned
      overdue:       overdueCount,                  // past due date and not returned
    };

    // Only send the 5 most recent history items to keep the dashboard compact.
    // The full list is available on the "My Loans" page.
    const recentHistory = historyItems.slice(0, 5);

    // ── Send the complete dashboard response ─────────────────────────────────
    return res.status(200).json({
      stats,
      activeLoans,
      recentHistory,
    });

  } catch (error) {
    console.error("Member dashboard error:", error.message);
    return res.status(500).json({
      message: "Failed to load member dashboard data.",
      error: error.message,
    });
  }
};

module.exports = { getMemberDashboard };
