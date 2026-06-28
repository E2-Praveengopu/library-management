const express = require("express");
const router  = express.Router();
const { verifyToken, authorizeMember } = require("../middleware/authMiddleware");
const { getMemberDashboard } = require("../controllers/memberDashboardController");
const { borrowBook, returnBook, getMyBorrowings } = require("../controllers/borrowingController");

/**
 * MEMBER ROUTES (Protected — Member only)
 *
 * All routes here go through two middleware functions:
 *  1. verifyToken    → checks that the request has a valid JWT token
 *  2. authorizeMember → checks that the logged-in user has the "member" role
 *
 * FULL ROUTE TABLE:
 *   GET  /api/member/dashboard          → welcome message (existing)
 *   GET  /api/member/my-books           → get all of this member's borrowed books
 *   POST /api/member/borrow/:bookId     → borrow a specific book by its ID
 *   PUT  /api/member/return/:borrowId   → return a specific borrowed book
 */


/**
 * GET /api/member/dashboard
 *
 * Returns the logged-in member's dashboard data:
 *   stats         → totalBorrowed, activeBorrows, returned, overdue
 *   activeLoans   → books the member currently holds, with due dates and overdue flags
 *   recentHistory → last 5 books the member has returned
 */
router.get("/dashboard", verifyToken, authorizeMember, getMemberDashboard);


/**
 * GET /api/member/my-books
 *
 * Returns all books that the logged-in member has borrowed (past and present).
 * Each record includes the book's details and the borrow status.
 *
 * Response: { message, borrowings: [{ id, status, dueDate, returnedAt, borrowedAt, book: {...} }] }
 *
 * Middleware chain: verifyToken → authorizeMember → getMyBorrowings
 */
router.get("/my-books", verifyToken, authorizeMember, getMyBorrowings);


/**
 * POST /api/member/borrow/:bookId
 *
 * Borrows the book with the given ID for the logged-in member.
 *
 * The bookId comes from the URL: POST /api/member/borrow/7 → bookId = 7
 *
 * Rules enforced by the controller:
 *   - The book must exist in the catalog
 *   - At least one copy must be available (availableCopies > 0)
 *   - The member must not already have this book borrowed
 *
 * On success: creates a Borrowing record, decrements book.availableCopies by 1
 * Response: { message, borrowing: { id, bookId, dueDate, status } }
 *
 * Middleware chain: verifyToken → authorizeMember → borrowBook
 */
router.post("/borrow/:bookId", verifyToken, authorizeMember, borrowBook);


/**
 * PUT /api/member/return/:borrowId
 *
 * Marks a borrowed book as returned.
 *
 * The borrowId is the ID of the Borrowing record (not the book ID).
 * Only the member who borrowed it can return it.
 *
 * On success: updates Borrowing.status to "returned", increments book.availableCopies
 * Response: { message, borrowing: { id, status, returnedAt } }
 *
 * Middleware chain: verifyToken → authorizeMember → returnBook
 */
router.put("/return/:borrowId", verifyToken, authorizeMember, returnBook);


module.exports = router;
