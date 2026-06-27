const express = require("express");
const router  = express.Router();

const { verifyToken, authorizeAdmin } = require("../middleware/authMiddleware");
const upload                          = require("../middleware/uploadMiddleware");
const {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require("../controllers/bookController");

/**
 * BOOK ROUTES
 *
 * This file defines all the URL endpoints (routes) for the book catalog.
 * In server.js, all these routes are registered under "/api/books",
 * so every path here gets "/api/books" added in front of it.
 *
 * FULL ROUTE TABLE:
 *   GET    /api/books            → getAllBooks    (admin + member)
 *   GET    /api/books/:id        → getBookById   (admin + member)
 *   POST   /api/books            → addBook       (admin only)
 *   PUT    /api/books/:id        → updateBook    (admin only)
 *   DELETE /api/books/:id        → deleteBook    (admin only)
 *
 * ─────────────────────────────────────────────────────────────
 * UNDERSTANDING MIDDLEWARE CHAINS
 * ─────────────────────────────────────────────────────────────
 *
 * A middleware chain is a list of functions that run ONE AFTER ANOTHER
 * before the final controller function handles the request.
 *
 * They run in LEFT TO RIGHT order (the order you write them).
 * Each one calls next() to pass control to the next function in the chain.
 * If a middleware sends a response (like a 401 or 403 error), the chain STOPS.
 *
 * Middleware used here:
 *
 *   verifyToken
 *     Checks that the request has a valid JWT token in the Authorization header.
 *     If there is no token or the token is expired → responds with 401 Unauthorized.
 *     If valid → saves the user info into req.user and calls next().
 *     Defined in: middleware/authMiddleware.js
 *
 *   authorizeAdmin
 *     Checks that the logged-in user has the role "admin".
 *     If the user is a "member" → responds with 403 Forbidden.
 *     If the user is an "admin" → calls next().
 *     Must always run AFTER verifyToken (it needs req.user to be set).
 *     Defined in: middleware/authMiddleware.js
 *
 *   upload.single("coverImage")
 *     Reads the uploaded file from the "coverImage" form field.
 *     Saves the file to disk (in uploads/books/).
 *     Puts file info into req.file so the controller can use it.
 *     "single" means accept only one file at a time.
 *     Defined in: middleware/uploadMiddleware.js
 */

// ─── READ ROUTES ─────────────────────────────────────────────────────────────
// Available to any logged-in user (admin OR member)

/**
 * GET /api/books
 *
 * Returns a paginated list of all books in the catalog.
 *
 * Optional query parameters in the URL:
 *   ?page=1   — which page to show (default is 1)
 *   ?limit=10 — how many books per page (default is 10)
 *
 * Example requests:
 *   GET /api/books              → page 1, 10 books
 *   GET /api/books?page=2       → page 2, 10 books
 *   GET /api/books?page=1&limit=5 → page 1, 5 books
 *
 * Middleware chain: verifyToken → getAllBooks
 */
router.get("/", verifyToken, getAllBooks);

/**
 * GET /api/books/:id
 *
 * Returns the details of a single book by its ID.
 *
 * Example request:
 *   GET /api/books/4  → returns the book with id = 4
 *
 * Middleware chain: verifyToken → getBookById
 */
router.get("/:id", verifyToken, getBookById);

// ─── WRITE ROUTES ─────────────────────────────────────────────────────────────
// Admin only — members are blocked by the authorizeAdmin middleware

/**
 * POST /api/books
 *
 * Adds a new book to the catalog.
 *
 * IMPORTANT: Send this request as "multipart/form-data" (NOT JSON).
 * This is required because the request may include a file (cover image).
 * Most API testing tools (Postman, Insomnia) have a "form-data" tab for this.
 *
 * Required form fields:
 *   title        (text)
 *   author       (text)
 *   isbn         (text)
 *   genre        (text)
 *   totalCopies  (number)
 *
 * Optional form field:
 *   coverImage   (file — must be JPG, PNG, or WEBP, max 5 MB)
 *
 * Middleware chain: verifyToken → authorizeAdmin → upload.single → addBook
 */
router.post(
  "/",
  verifyToken,
  authorizeAdmin,
  upload.single("coverImage"),
  addBook
);

/**
 * PUT /api/books/:id
 *
 * Updates an existing book's details.
 * Only the fields you include in the request will be changed.
 * Fields you leave out keep their current values.
 *
 * IMPORTANT: Send as "multipart/form-data" (same reason as POST — may include a file).
 *
 * Optional form fields (include only what you want to change):
 *   title, author, isbn, genre, totalCopies, availableCopies, coverImage (file)
 *
 * Example: To only update the genre:
 *   PUT /api/books/4
 *   Body: { genre: "Science Fiction" }
 *
 * Middleware chain: verifyToken → authorizeAdmin → upload.single → updateBook
 */
router.put(
  "/:id",
  verifyToken,
  authorizeAdmin,
  upload.single("coverImage"),
  updateBook
);

/**
 * DELETE /api/books/:id
 *
 * Permanently deletes a book from the catalog.
 * Also deletes the book's cover image from the server disk.
 *
 * Example request:
 *   DELETE /api/books/4  → deletes the book with id = 4
 *
 * No request body or file needed — just the ID in the URL.
 *
 * Middleware chain: verifyToken → authorizeAdmin → deleteBook
 */
router.delete("/:id", verifyToken, authorizeAdmin, deleteBook);

module.exports = router;
