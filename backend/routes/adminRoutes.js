const express = require("express");
const router  = express.Router();
const { verifyToken, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  getAllBorrowings,
  issueBorrow,
  adminMarkReturned,
  getMembers,
  getAvailableBooks,
} = require("../controllers/adminBorrowingController");

/**
 * ADMIN ROUTES (Protected — Admin only)
 *
 * All routes here require:
 *  1. verifyToken    → valid JWT in the Authorization header
 *  2. authorizeAdmin → user must have role = "admin"
 *
 * FULL ROUTE TABLE:
 *   GET  /api/admin/dashboard                    → welcome message
 *   GET  /api/admin/borrowings                   → all borrowings (paginated, filterable)
 *   POST /api/admin/borrowings/issue             → issue a book to a member
 *   PUT  /api/admin/borrowings/:id/return        → mark a borrowing as returned
 *   GET  /api/admin/members                      → list of all members (for dropdown)
 *   GET  /api/admin/available-books              → books with copies available (for dropdown)
 */


// ─── DASHBOARD ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 * Simple confirmation the admin's token is valid.
 */
router.get("/dashboard", verifyToken, authorizeAdmin, (req, res) => {
  return res.status(200).json({
    message: `Welcome to the Admin Dashboard, user ID: ${req.user.id}`,
    role: req.user.role,
  });
});


// ─── BORROWING MANAGEMENT ─────────────────────────────────────────────────────

/**
 * GET /api/admin/borrowings
 *
 * Returns all borrowing records across all members.
 * Each record includes member info, book info, and an "isOverdue" flag.
 *
 * Query parameters:
 *   ?page=1                  — page number (default 1)
 *   ?limit=15                — records per page (default 15)
 *   ?status=all|borrowed|returned|overdue
 *   ?search=text             — search by member name, email, or book title
 *
 * Response includes a "stats" object with { overdueCount }.
 */
router.get("/borrowings", verifyToken, authorizeAdmin, getAllBorrowings);

/**
 * POST /api/admin/borrowings/issue
 *
 * Admin issues a book to a member and records the transaction.
 *
 * Body (JSON):
 *   { userId: number, bookId: number, dueDate?: "YYYY-MM-DD" }
 *
 * Rules:
 *   - Book must have availableCopies > 0
 *   - Member must not already have this exact book borrowed
 *   - dueDate is optional; defaults to today + 14 days
 *
 * On success: creates a Borrowing record, decrements book.availableCopies
 *
 * IMPORTANT: This route must be placed BEFORE the /:id/return route
 * so Express does not interpret "issue" as an :id parameter.
 */
router.post("/borrowings/issue", verifyToken, authorizeAdmin, issueBorrow);

/**
 * PUT /api/admin/borrowings/:id/return
 *
 * Admin marks any borrowing as returned.
 * Unlike the member route, the admin is NOT restricted to their own borrowings.
 *
 * On success: sets status="returned", returnedAt=now, increments availableCopies
 */
router.put("/borrowings/:id/return", verifyToken, authorizeAdmin, adminMarkReturned);


// ─── LOOKUP LISTS (used by the Issue Book modal dropdowns) ───────────────────

/**
 * GET /api/admin/members
 *
 * Returns all users with role="member" as { id, name, email }.
 * Used to populate the "Select Member" dropdown in the Issue Book modal.
 */
router.get("/members", verifyToken, authorizeAdmin, getMembers);

/**
 * GET /api/admin/available-books
 *
 * Returns all books that have at least 1 copy available.
 * Used to populate the "Select Book" dropdown in the Issue Book modal.
 * Only shows borrowable books so the admin can't issue an unavailable title.
 */
router.get("/available-books", verifyToken, authorizeAdmin, getAvailableBooks);


module.exports = router;
