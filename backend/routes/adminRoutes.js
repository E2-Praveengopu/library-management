const express = require("express");
const router  = express.Router();
const { verifyToken, authorizeAdmin } = require("../middleware/authMiddleware");

const { getAdminDashboard } = require("../controllers/adminDashboardController");

const {
  getAllBorrowings,
  issueBorrow,
  adminMarkReturned,
  getAvailableBooks,
} = require("../controllers/adminBorrowingController");

const {
  getAllMembers,
  getMemberById,
  toggleMemberStatus,
} = require("../controllers/memberController");

/**
 * ADMIN ROUTES (Protected — Admin only)
 *
 * All routes require:
 *  1. verifyToken    → valid JWT in the Authorization header
 *  2. authorizeAdmin → user must have role = "admin"
 *
 * FULL ROUTE TABLE:
 * ─── Dashboard ─────────────────────────────────────────────
 *   GET  /api/admin/dashboard                  → welcome message
 *
 * ─── Member Management ─────────────────────────────────────
 *   GET  /api/admin/members                    → paginated member list (search + status filter)
 *   GET  /api/admin/members/:id                → single member profile + loans + history
 *   PUT  /api/admin/members/:id/status         → activate or deactivate a member account
 *
 * ─── Borrow Management ─────────────────────────────────────
 *   GET  /api/admin/borrowings                 → all borrowings (paginated, filterable, searchable)
 *   POST /api/admin/borrowings/issue           → admin issues a book to a member
 *   PUT  /api/admin/borrowings/:id/return      → admin marks any borrowing as returned
 *   GET  /api/admin/available-books            → books with available copies (for issue dropdown)
 */


// ─── DASHBOARD ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 *
 * Returns real dashboard data:
 *   stats         → totalBooks, totalMembers, activeLoans, overdueLoans
 *   recentBooks   → last 5 books added to the catalog
 *   recentBorrows → last 5 borrowing records with member + book info
 */
router.get("/dashboard", verifyToken, authorizeAdmin, getAdminDashboard);


// ─── MEMBER MANAGEMENT ───────────────────────────────────────────────────────

/**
 * GET /api/admin/members
 *
 * Returns a paginated list of all registered members with profile data,
 * loan counts, and status. Supports live search and status filtering.
 *
 * Query parameters:
 *   ?page=1
 *   ?limit=12
 *   ?status=all|active|inactive
 *   ?search=text   — matches name or email (case-insensitive)
 *
 * Response includes:
 *   pagination  — { currentPage, totalPages, totalMembers, ... }
 *   stats       — { total, active, inactive }  (always over the full dataset)
 *   members     — array of member objects with activeLoansCount, totalLoansCount
 *
 * Also used by the Issue Book modal for its member dropdown
 * (call with ?status=active&limit=200 for the full active-member list).
 */
router.get("/members", verifyToken, authorizeAdmin, getAllMembers);

/**
 * GET /api/admin/members/:id
 *
 * Returns a complete member profile including:
 *   - Basic info (name, email, isActive, joinedAt)
 *   - Lifetime stats (totalLoans, activeLoans, returnedLoans, overdueLoans)
 *   - activeLoans array with full book details and isOverdue flag
 *   - history array (last 20 returned books)
 *
 * IMPORTANT: This route must be placed AFTER any fixed sub-paths like
 * routes that don't have a variable segment, to prevent Express from
 * treating a keyword as an :id parameter.
 */
router.get("/members/:id", verifyToken, authorizeAdmin, getMemberById);

/**
 * PUT /api/admin/members/:id/status
 *
 * Activates or deactivates a member's account.
 *
 * Body: { isActive: true | false }
 *
 * Effects of deactivation:
 *   - Member cannot log in (blocked by authController)
 *   - Member's loan history is preserved
 *   - Member is excluded from the Issue Book dropdown
 *
 * Admin accounts are protected — they cannot be deactivated here.
 */
router.put("/members/:id/status", verifyToken, authorizeAdmin, toggleMemberStatus);


// ─── BORROW MANAGEMENT ───────────────────────────────────────────────────────

/**
 * GET /api/admin/borrowings
 *
 * Returns all borrowing records (paginated, filterable, searchable).
 * Each record includes member info, book info, and isOverdue flag.
 *
 * Query params: ?page ?limit ?status=all|borrowed|returned|overdue ?search
 */
router.get("/borrowings", verifyToken, authorizeAdmin, getAllBorrowings);

/**
 * POST /api/admin/borrowings/issue
 *
 * Admin issues a book to a member.
 * Body: { userId, bookId, dueDate? }
 *
 * IMPORTANT: Must be before /:id/return to avoid "issue" matching as :id.
 */
router.post("/borrowings/issue", verifyToken, authorizeAdmin, issueBorrow);

/**
 * PUT /api/admin/borrowings/:id/return
 *
 * Admin marks any borrowing as returned (no ownership restriction).
 */
router.put("/borrowings/:id/return", verifyToken, authorizeAdmin, adminMarkReturned);

/**
 * GET /api/admin/available-books
 *
 * Books with at least 1 available copy.
 * Used by the Issue Book modal's book dropdown.
 */
router.get("/available-books", verifyToken, authorizeAdmin, getAvailableBooks);


module.exports = router;
