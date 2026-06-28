/**
 * BORROWING CONTROLLER
 *
 * Handles all borrow and return operations for library members.
 *
 * ROUTES HANDLED (all require a valid member JWT token):
 *   POST   /api/member/borrow/:bookId   → borrowBook
 *   PUT    /api/member/return/:borrowId → returnBook
 *   GET    /api/member/my-books         → getMyBorrowings
 *
 * BUSINESS RULES:
 *   - A member can only borrow a book if availableCopies > 0
 *   - A member cannot borrow the same book twice simultaneously
 *   - Returning a book increases availableCopies by 1
 *   - The due date is always 14 days from the borrow date
 */

const Book = require("../models/Book");
const Borrowing = require("../models/Borrowing");

/**
 * Builds a full URL for a book's cover image.
 * We re-define this helper here so borrowingController doesn't depend on bookController.
 *
 * @param {object} req      - Express request object (gives us the server address)
 * @param {string} filename - The image filename stored in the database
 * @returns {string|null}   - Full URL or null if no image
 */
function buildCoverImageUrl(req, filename) {
  if (!filename) return null;
  return req.protocol + "://" + req.get("host") + "/uploads/books/" + filename;
}


// =============================================================================
// BORROW BOOK
// Route: POST /api/member/borrow/:bookId
// Access: Members only
// =============================================================================

/**
 * BORROW BOOK
 *
 * Creates a new borrowing record for the logged-in member.
 *
 * STEP BY STEP:
 *   1. Find the book by the bookId in the URL
 *   2. Check that at least one copy is available
 *   3. Check the member hasn't already borrowed this book (and not returned it)
 *   4. Create a Borrowing record with status = "borrowed"
 *   5. Decrease the book's availableCopies by 1
 *   6. Return the new borrowing record
 *
 * @param {object} req - req.params.bookId = book ID; req.user.id = logged-in member's ID
 * @param {object} res - Response object
 */
const borrowBook = async (req, res) => {
  try {

    const bookId = req.params.bookId;
    const userId = req.user.id; // set by verifyToken middleware

    // --- STEP 1: Find the book ---
    const book = await Book.findByPk(bookId);

    if (!book) {
      return res.status(404).json({
        message: "Book not found. It may have been removed from the catalog.",
      });
    }

    // --- STEP 2: Check if any copies are currently available ---
    if (book.availableCopies < 1) {
      return res.status(400).json({
        message: "Sorry, no copies of this book are currently available.",
      });
    }

    // --- STEP 3: Check if the member already has this book borrowed ---
    // We look for an active (not returned) borrowing for this user+book combination
    const existingBorrowing = await Borrowing.findOne({
      where: {
        userId: userId,
        bookId: bookId,
        status: "borrowed", // only "borrowed" — if they returned it, they can borrow again
      },
    });

    if (existingBorrowing) {
      return res.status(409).json({
        message: "You already have this book borrowed. Please return it before borrowing again.",
      });
    }

    // --- STEP 4: Calculate the due date (14 days from today) ---
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // --- STEP 5: Create the borrowing record in the database ---
    const newBorrowing = await Borrowing.create({
      userId:  userId,
      bookId:  bookId,
      status:  "borrowed",
      dueDate: dueDate,
    });

    // --- STEP 6: Decrease the book's available copies by 1 ---
    // One copy has just left the shelf
    await book.update({
      availableCopies: book.availableCopies - 1,
    });

    // --- STEP 7: Send back the confirmation ---
    return res.status(201).json({
      message: `"${book.title}" has been borrowed successfully. Please return it by ${dueDate.toDateString()}.`,
      borrowing: {
        id:         newBorrowing.id,
        bookId:     book.id,
        bookTitle:  book.title,
        status:     newBorrowing.status,
        dueDate:    newBorrowing.dueDate,
        borrowedAt: newBorrowing.createdAt,
      },
    });

  } catch (error) {
    console.error("Borrow book error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while borrowing the book.",
      error: error.message,
    });
  }
};


// =============================================================================
// RETURN BOOK
// Route: PUT /api/member/return/:borrowId
// Access: Members only
// =============================================================================

/**
 * RETURN BOOK
 *
 * Updates a borrowing record to mark the book as returned.
 *
 * STEP BY STEP:
 *   1. Find the borrowing record (must belong to the logged-in member)
 *   2. Check that it hasn't already been returned
 *   3. Update status to "returned", set returnedAt to now
 *   4. Increase the book's availableCopies by 1 (it's back on the shelf)
 *   5. Return a success message
 *
 * @param {object} req - req.params.borrowId = borrowing record ID; req.user.id = member's ID
 * @param {object} res - Response object
 */
const returnBook = async (req, res) => {
  try {

    const borrowId = req.params.borrowId;
    const userId   = req.user.id;

    // --- STEP 1: Find the borrowing record ---
    // We check both the borrowId AND the userId so a member can only return THEIR OWN books
    const borrowing = await Borrowing.findOne({
      where: {
        id:     borrowId,
        userId: userId,
      },
    });

    if (!borrowing) {
      return res.status(404).json({
        message: "Borrowing record not found. Make sure you are returning your own book.",
      });
    }

    // --- STEP 2: Check it hasn't already been returned ---
    if (borrowing.status === "returned") {
      return res.status(400).json({
        message: "This book has already been returned.",
      });
    }

    // --- STEP 3: Mark the borrowing as returned ---
    await borrowing.update({
      status:     "returned",
      returnedAt: new Date(), // record the exact time of return
    });

    // --- STEP 4: Give the copy back to the shelf ---
    const book = await Book.findByPk(borrowing.bookId);
    if (book) {
      await book.update({
        availableCopies: book.availableCopies + 1,
      });
    }

    return res.status(200).json({
      message: "Book returned successfully. Thank you!",
      borrowing: {
        id:         borrowing.id,
        bookId:     borrowing.bookId,
        status:     borrowing.status,
        returnedAt: borrowing.returnedAt,
      },
    });

  } catch (error) {
    console.error("Return book error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while returning the book.",
      error: error.message,
    });
  }
};


// =============================================================================
// GET MY BORROWINGS
// Route: GET /api/member/my-books
// Access: Members only
// =============================================================================

/**
 * GET MY BORROWINGS
 *
 * Returns all borrowing records for the currently logged-in member,
 * including the book details for each record.
 *
 * This uses an "include" (JOIN) to fetch the Book associated with each
 * Borrowing record in a single database query instead of multiple queries.
 *
 * Response includes both active (borrowed) and past (returned) borrowings.
 * The frontend can filter/separate them by checking the "status" field.
 *
 * @param {object} req - req.user.id = logged-in member's ID
 * @param {object} res - Response object
 */
const getMyBorrowings = async (req, res) => {
  try {

    const userId = req.user.id;

    // findAll with "include" performs a JOIN between Borrowings and Books
    // The "as: 'book'" alias must match the association alias set in server.js
    const borrowings = await Borrowing.findAll({
      where: { userId: userId },
      include: [
        {
          model: Book,
          as:    "book", // alias defined in the association (server.js)
          attributes: ["id", "title", "author", "genre", "isbn", "coverImage"],
        },
      ],
      order: [["createdAt", "DESC"]], // most recent first
    });

    // Build the response, adding the full cover image URL for each book
    const result = borrowings.map(function (b) {
      return {
        id:         b.id,
        status:     b.status,
        dueDate:    b.dueDate,
        returnedAt: b.returnedAt,
        borrowedAt: b.createdAt,
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

    return res.status(200).json({
      message: "Your borrowings retrieved successfully.",
      borrowings: result,
    });

  } catch (error) {
    console.error("Get my borrowings error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while fetching your borrowed books.",
      error: error.message,
    });
  }
};


module.exports = {
  borrowBook,
  returnBook,
  getMyBorrowings,
};
