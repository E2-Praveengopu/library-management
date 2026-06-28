const fs   = require("fs");   // built-in Node.js module — reads/writes/deletes files on disk
const path = require("path"); // built-in Node.js module — builds file paths correctly
const { Op } = require("sequelize"); // Op = Sequelize operators for WHERE conditions (like, gt, or, etc.)
const sequelize = require("../config/database"); // needed for sequelize.fn() in getGenres
const Book = require("../models/Book");

// =============================================================================
// HELPER FUNCTIONS
// Small reusable functions used by multiple controllers below.
// =============================================================================

/**
 * buildCoverImageUrl()
 *
 * Creates the full web address (URL) for a book's cover image.
 *
 * WHY DO WE NEED THIS?
 * In the database, we only store the image filename (e.g. "book-123.jpg").
 * But the frontend needs a complete URL it can put into an <img> tag,
 * like: http://localhost:5000/uploads/books/book-123.jpg
 *
 * This function combines the server's address with the filename
 * to produce that complete URL.
 *
 * HOW IT WORKS:
 *   req.protocol → "http" or "https" (how the server is accessed)
 *   req.get("host") → "localhost:5000" (the server address and port)
 *   Together: "http://localhost:5000/uploads/books/book-123.jpg"
 *
 * @param {object} req      - The Express request object (gives us the server address)
 * @param {string} filename - The filename stored in the database (e.g. "book-123.jpg")
 * @returns {string|null}   - The full image URL, or null if there is no image
 */
function buildCoverImageUrl(req, filename) {
  // If no filename is stored, there is no image — return null
  if (!filename) {
    return null;
  }

  // Build and return the full URL
  return req.protocol + "://" + req.get("host") + "/uploads/books/" + filename;
}

/**
 * deleteImageFromDisk()
 *
 * Permanently deletes an image file from the server's hard drive.
 *
 * WHY DO WE NEED THIS?
 * When a book is deleted, or when the admin uploads a new cover image
 * to replace an old one, the old image file is no longer needed.
 * If we leave it on disk, it wastes storage space.
 *
 * HOW IT WORKS:
 *   We first check if the file actually exists on disk before trying to delete it.
 *   This prevents the server from crashing if the file has already been removed.
 *   fs.unlinkSync() is the Node.js function that deletes a file.
 *
 * @param {string} filename - The image filename to delete (e.g. "book-123.jpg")
 */
function deleteImageFromDisk(filename) {
  // If there is no filename, there is nothing to delete — just exit the function
  if (!filename) {
    return;
  }

  // Build the full path to the file on disk
  // path.join() works on all operating systems (Windows, Mac, Linux)
  const filePath = path.join("uploads", "books", filename);

  // Only delete if the file actually exists — this prevents crashes
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath); // delete the file
  }
}

// =============================================================================
// CONTROLLER FUNCTIONS
// Each function below handles one specific API route.
// =============================================================================

/**
 * ADD BOOK
 * Route: POST /api/books
 * Access: Admin only
 *
 * Adds a new book to the library catalog.
 *
 * This route accepts "multipart/form-data" instead of JSON because
 * it needs to handle both text fields (title, author, etc.) AND
 * an optional file (the cover image) in the same request.
 *
 * Before this function runs, the multer middleware (uploadMiddleware.js)
 * has already saved the image file to disk and put its info into req.file.
 *
 * STEP BY STEP:
 *   1. Read the text fields from req.body
 *   2. Check that all required fields are present
 *   3. Convert totalCopies from string to number
 *   4. Check that the ISBN is not already in the database
 *   5. Save the new book to the database
 *   6. Send back the new book data with a success message
 *
 * IMPORTANT CLEANUP RULE:
 *   If any validation step fails, multer may have ALREADY saved the image file.
 *   We must delete it manually in those cases, or it will stay on disk forever.
 *
 * @param {object} req - The request object. Contains:
 *                         req.body  — the text form fields (title, author, isbn, genre, totalCopies)
 *                         req.file  — the uploaded image file info (or undefined if no file)
 *                         req.user  — the logged-in admin's info (set by verifyToken middleware)
 * @param {object} res - The response object. Used to send data back to the client.
 */
const addBook = async (req, res) => {
  try {

    // --- STEP 1: Read the text fields from the form ---
    const { title, author, isbn, genre, totalCopies } = req.body;

    // --- STEP 2: Check that all required fields are present ---
    if (!title || !author || !isbn || !genre || !totalCopies) {

      // Validation failed — if an image was uploaded, delete it
      // (we don't want an orphan file sitting on disk)
      if (req.file) {
        deleteImageFromDisk(req.file.filename);
      }

      return res.status(400).json({
        message: "All fields are required: title, author, isbn, genre, totalCopies",
      });
    }

    // --- STEP 3: Convert totalCopies from a string to a whole number ---
    // Form data always comes in as strings (text), even if the value is a number.
    // parseInt() converts "5" (string) to 5 (number).
    // The second argument "10" means "use base 10" (normal counting numbers).
    const numberOfCopies = parseInt(totalCopies, 10);

    // Make sure it is a valid number and at least 1
    if (isNaN(numberOfCopies) || numberOfCopies < 1) {
      if (req.file) deleteImageFromDisk(req.file.filename);

      return res.status(400).json({
        message: "totalCopies must be a whole number of 1 or more",
      });
    }

    // --- STEP 4: Check if a book with this ISBN already exists in the database ---
    // findOne() searches the database for ONE record matching the condition
    const existingBook = await Book.findOne({ where: { isbn: isbn } });

    if (existingBook) {
      // A book with this ISBN is already in the catalog — reject the request
      if (req.file) deleteImageFromDisk(req.file.filename);

      return res.status(409).json({
        message: "A book with this ISBN already exists in the catalog",
      });
    }

    // --- STEP 5: Save the new book to the database ---
    // When a book is first added, ALL copies are available (no one has borrowed any yet)
    const newBook = await Book.create({
      title:           title,
      author:          author,
      isbn:            isbn,
      genre:           genre,
      totalCopies:     numberOfCopies,
      availableCopies: numberOfCopies, // all copies start as available
      // If an image was uploaded, save its filename. If not, save null.
      coverImage: req.file ? req.file.filename : null,
    });

    // --- STEP 6: Send back the newly created book ---
    return res.status(201).json({
      message: "Book added to the catalog successfully",
      book: {
        id:              newBook.id,
        title:           newBook.title,
        author:          newBook.author,
        isbn:            newBook.isbn,
        genre:           newBook.genre,
        totalCopies:     newBook.totalCopies,
        availableCopies: newBook.availableCopies,
        coverImage:      newBook.coverImage,
        // Build the full URL so the frontend can display the image
        coverImageUrl:   buildCoverImageUrl(req, newBook.coverImage),
        createdAt:       newBook.createdAt,
      },
    });

  } catch (error) {
    // Something unexpected went wrong (e.g. database error)
    // Clean up any uploaded file before responding with an error
    if (req.file) deleteImageFromDisk(req.file.filename);

    console.error("Add book error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while adding the book",
      error: error.message,
    });
  }
};

/**
 * GET ALL BOOKS (with Pagination)
 * Route: GET /api/books?page=1&limit=10
 * Access: Admin and Member
 *
 * Returns a paginated list of all books in the catalog.
 *
 * WHAT IS PAGINATION?
 * Imagine the library has 500 books. Sending all 500 at once would:
 *   - Slow down the response (lots of data to transfer)
 *   - Make the frontend slow to display
 *
 * Pagination solves this by breaking the results into "pages".
 * Instead of 500 books at once, you get 10 books per page, 50 pages total.
 *
 * HOW TO USE PAGINATION (Query Parameters in the URL):
 *   GET /api/books            → page 1, 10 books per page (defaults)
 *   GET /api/books?page=2     → page 2, 10 books per page
 *   GET /api/books?limit=5    → page 1, 5 books per page
 *   GET /api/books?page=3&limit=20 → page 3, 20 books per page
 *
 * HOW THE MATH WORKS:
 *   page = 1, limit = 10  → skip 0 books,  show books 1–10
 *   page = 2, limit = 10  → skip 10 books, show books 11–20
 *   page = 3, limit = 10  → skip 20 books, show books 21–30
 *
 *   The number of books to skip is called the "offset":
 *   offset = (page - 1) × limit
 *
 * @param {object} req - The request object. Contains:
 *                         req.query.page  — which page to show (default: 1)
 *                         req.query.limit — how many books per page (default: 10)
 * @param {object} res - The response object.
 */
const getAllBooks = async (req, res) => {
  try {

    // --- Read page and limit from the URL query string ---
    // If the user does not provide these, use the default values.
    //
    // Example URL: /api/books?page=2&limit=5
    //   req.query.page  = "2"  (it's a string from the URL)
    //   req.query.limit = "5"
    //
    // We use parseInt() to convert them from strings to numbers.
    const page  = parseInt(req.query.page,  10) || 1;  // default: page 1
    const limit = parseInt(req.query.limit, 10) || 10; // default: 10 books per page

    // Make sure page and limit are not negative or zero
    if (page < 1 || limit < 1) {
      return res.status(400).json({
        message: "page and limit must be positive numbers (1 or greater)",
      });
    }

    // --- Calculate the offset ---
    // offset = how many records to SKIP before starting to collect results
    //
    // Example:
    //   page=1, limit=10 → offset = (1-1) × 10 = 0  → start from the very first book
    //   page=2, limit=10 → offset = (2-1) × 10 = 10 → skip the first 10 books
    //   page=3, limit=10 → offset = (3-1) × 10 = 20 → skip the first 20 books
    const offset = (page - 1) * limit;

    // --- Read optional search/filter parameters ---
    // These come from URL query strings, e.g. /api/books?search=gatsby&genre=Fiction&available=true
    const { search, genre, available } = req.query;

    // Build the WHERE clause dynamically based on which filters were provided
    // whereClause starts empty {} — we only add conditions that were requested
    const whereClause = {};

    // SEARCH FILTER: case-insensitive match across title, author, or isbn
    // Op.or = match ANY of the conditions (not all of them)
    // Op.iLike = case-insensitive LIKE (PostgreSQL only — "iLike" is not standard SQL)
    // '%gatsby%' matches "The Great Gatsby", "gatsby Revisited", etc.
    if (search && search.trim()) {
      whereClause[Op.or] = [
        { title:  { [Op.iLike]: "%" + search.trim() + "%" } },
        { author: { [Op.iLike]: "%" + search.trim() + "%" } },
        { isbn:   { [Op.iLike]: "%" + search.trim() + "%" } },
      ];
    }

    // GENRE FILTER: case-insensitive exact genre match
    // "Fiction" and "fiction" both find the same genre
    if (genre && genre.trim()) {
      whereClause.genre = { [Op.iLike]: genre.trim() };
    }

    // AVAILABILITY FILTER: only show books with at least 1 copy on the shelf
    // Op.gt = "greater than" — availableCopies > 0
    if (available === "true") {
      whereClause.availableCopies = { [Op.gt]: 0 };
    }

    // --- Fetch the books from the database with pagination and filtering ---
    // findAndCountAll() is a Sequelize method that does TWO things at once:
    //   1. count — counts ALL matching books (for calculating total pages)
    //   2. rows  — returns ONLY the books for the current page (using limit and offset)
    //
    // This is more efficient than fetching everything and slicing it in JavaScript.
    const result = await Book.findAndCountAll({
      where:  whereClause,             // apply all the active filters
      order:  [["createdAt", "DESC"]], // newest books appear first
      limit:  limit,                   // how many to return for this page
      offset: offset,                  // how many to skip
    });

    // result.count = total number of books in the database (ALL pages combined)
    // result.rows  = the books for this specific page only
    const totalBooks = result.count;
    const books      = result.rows;

    // --- Calculate total number of pages ---
    // Math.ceil() rounds UP to the nearest whole number.
    // Example: 25 books ÷ 10 per page = 2.5 → rounds up to 3 pages
    const totalPages = Math.ceil(totalBooks / limit);

    // --- Build the final list with cover image URLs ---
    // We loop through each book and add the full image URL to the response
    const booksWithImageUrls = books.map(function (book) {
      return {
        id:              book.id,
        title:           book.title,
        author:          book.author,
        isbn:            book.isbn,
        genre:           book.genre,
        totalCopies:     book.totalCopies,
        availableCopies: book.availableCopies,
        coverImage:      book.coverImage,
        coverImageUrl:   buildCoverImageUrl(req, book.coverImage),
        createdAt:       book.createdAt,
        updatedAt:       book.updatedAt,
      };
    });

    // --- Send the response ---
    return res.status(200).json({
      message: "Books retrieved successfully",

      // Pagination information — the frontend uses this to show page buttons
      pagination: {
        currentPage:    page,
        totalPages:     totalPages,
        totalBooks:     totalBooks,
        booksPerPage:   limit,
        // hasNextPage is true if there are more pages after the current one
        hasNextPage:    page < totalPages,
        // hasPreviousPage is true if we are not on the first page
        hasPreviousPage: page > 1,
      },

      books: booksWithImageUrls,
    });

  } catch (error) {
    console.error("Get all books error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while fetching books",
      error: error.message,
    });
  }
};

/**
 * GET SINGLE BOOK
 * Route: GET /api/books/:id
 * Access: Admin and Member
 *
 * Finds and returns one specific book using its ID.
 *
 * The :id in the route is a "route parameter".
 * When someone requests GET /api/books/7, Express puts 7 into req.params.id.
 *
 * @param {object} req - Contains req.params.id (the book's database ID from the URL)
 * @param {object} res - The response object.
 */
const getBookById = async (req, res) => {
  try {

    // Read the book ID from the URL
    const bookId = req.params.id;

    // findByPk() means "find by Primary Key"
    // Every database record has a unique Primary Key (the id column).
    // This looks up exactly one book using that ID.
    const book = await Book.findByPk(bookId);

    // If no book was found with that ID, tell the client it doesn't exist
    if (!book) {
      return res.status(404).json({
        message: "No book found with ID " + bookId,
      });
    }

    // Book was found — send it back
    return res.status(200).json({
      message: "Book retrieved successfully",
      book: {
        id:              book.id,
        title:           book.title,
        author:          book.author,
        isbn:            book.isbn,
        genre:           book.genre,
        totalCopies:     book.totalCopies,
        availableCopies: book.availableCopies,
        coverImage:      book.coverImage,
        coverImageUrl:   buildCoverImageUrl(req, book.coverImage),
        createdAt:       book.createdAt,
        updatedAt:       book.updatedAt,
      },
    });

  } catch (error) {
    console.error("Get book by ID error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while fetching the book",
      error: error.message,
    });
  }
};

/**
 * UPDATE BOOK
 * Route: PUT /api/books/:id
 * Access: Admin only
 *
 * Updates the details of an existing book in the catalog.
 *
 * PARTIAL UPDATES ARE ALLOWED:
 * You do NOT have to send every field in the request.
 * Only the fields you include in the request will be changed.
 * Fields you leave out will keep their current database values.
 *
 * Example: To only update the genre, send just { genre: "Science Fiction" }
 * The title, author, ISBN, and copies will stay the same.
 *
 * COVER IMAGE UPDATE:
 * To replace the cover image, include a new "coverImage" file in the form.
 * The old image will be deleted from disk, and the new one will be saved.
 * To keep the current image, just don't include any file in the request.
 *
 * @param {object} req - Contains:
 *                         req.params.id — the book ID from the URL
 *                         req.body      — the fields to update (all optional)
 *                         req.file      — new cover image (optional)
 * @param {object} res - The response object.
 */
const updateBook = async (req, res) => {
  try {

    const bookId = req.params.id;

    // First, check that the book exists
    // We need to do this before updating, or we might try to update nothing
    const book = await Book.findByPk(bookId);

    if (!book) {
      // Book not found — clean up any uploaded file and respond with 404
      if (req.file) deleteImageFromDisk(req.file.filename);

      return res.status(404).json({
        message: "No book found with ID " + bookId,
      });
    }

    // Read the fields the admin wants to update
    // These are all optional — they may or may not be in req.body
    const { title, author, isbn, genre, totalCopies, availableCopies } = req.body;

    // --- Handle totalCopies update ---
    // If totalCopies was sent, parse it. If not, keep the current value.
    let updatedTotalCopies = book.totalCopies; // start with the current value

    if (totalCopies !== undefined) {
      updatedTotalCopies = parseInt(totalCopies, 10);

      if (isNaN(updatedTotalCopies) || updatedTotalCopies < 1) {
        if (req.file) deleteImageFromDisk(req.file.filename);
        return res.status(400).json({
          message: "totalCopies must be a whole number of 1 or more",
        });
      }
    }

    // --- Handle availableCopies update ---
    let updatedAvailableCopies = book.availableCopies; // start with current value

    if (availableCopies !== undefined) {
      updatedAvailableCopies = parseInt(availableCopies, 10);

      if (isNaN(updatedAvailableCopies) || updatedAvailableCopies < 0) {
        if (req.file) deleteImageFromDisk(req.file.filename);
        return res.status(400).json({
          message: "availableCopies cannot be a negative number",
        });
      }
    }

    // --- Business rule: availableCopies cannot exceed totalCopies ---
    // Example: You can't have 7 available copies if you only own 5 total
    if (updatedAvailableCopies > updatedTotalCopies) {
      if (req.file) deleteImageFromDisk(req.file.filename);
      return res.status(400).json({
        message: "availableCopies (" + updatedAvailableCopies + ") cannot be greater than totalCopies (" + updatedTotalCopies + ")",
      });
    }

    // --- Handle cover image update ---
    // Start with the current image filename (no change by default)
    let updatedCoverImage = book.coverImage;

    if (req.file) {
      // A new image was uploaded
      // Delete the OLD image from disk first (to free up space)
      deleteImageFromDisk(book.coverImage);

      // Use the new image filename going forward
      updatedCoverImage = req.file.filename;
    }

    // --- Apply all the updates to the database ---
    // For text fields: use the new value if provided, otherwise keep the existing value
    // The || (OR) operator returns the LEFT side if it's truthy, otherwise the RIGHT side
    // So: (title || book.title) means "use the new title if given, else keep the old one"
    await book.update({
      title:           title           || book.title,
      author:          author          || book.author,
      isbn:            isbn            || book.isbn,
      genre:           genre           || book.genre,
      totalCopies:     updatedTotalCopies,
      availableCopies: updatedAvailableCopies,
      coverImage:      updatedCoverImage,
    });

    // Send back the updated book
    return res.status(200).json({
      message: "Book updated successfully",
      book: {
        id:              book.id,
        title:           book.title,
        author:          book.author,
        isbn:            book.isbn,
        genre:           book.genre,
        totalCopies:     book.totalCopies,
        availableCopies: book.availableCopies,
        coverImage:      book.coverImage,
        coverImageUrl:   buildCoverImageUrl(req, book.coverImage),
        updatedAt:       book.updatedAt,
      },
    });

  } catch (error) {
    // Clean up any uploaded file if something went wrong
    if (req.file) deleteImageFromDisk(req.file.filename);

    console.error("Update book error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while updating the book",
      error: error.message,
    });
  }
};

/**
 * DELETE BOOK
 * Route: DELETE /api/books/:id
 * Access: Admin only
 *
 * Permanently removes a book from the catalog.
 *
 * This does TWO things:
 *   1. Deletes the book RECORD from the PostgreSQL database
 *   2. Deletes the book's COVER IMAGE FILE from the server's hard drive
 *
 * WHY DELETE THE IMAGE TOO?
 * If we only deleted the database record, the image file would remain
 * on disk forever with nothing pointing to it. Over time this wastes storage.
 *
 * @param {object} req - Contains req.params.id (the book ID to delete)
 * @param {object} res - The response object.
 */
const deleteBook = async (req, res) => {
  try {

    const bookId = req.params.id;

    // Find the book first — we need its coverImage filename before we delete it
    // If we deleted the record first, we'd lose the filename
    const book = await Book.findByPk(bookId);

    if (!book) {
      return res.status(404).json({
        message: "No book found with ID " + bookId,
      });
    }

    // Delete the cover image file from disk (if the book had one)
    deleteImageFromDisk(book.coverImage);

    // Delete the book record from the database
    // book.destroy() removes this specific row from the Books table
    await book.destroy();

    return res.status(200).json({
      message: "Book deleted from the catalog successfully",
      deletedBookId: bookId,
    });

  } catch (error) {
    console.error("Delete book error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while deleting the book",
      error: error.message,
    });
  }
};

/**
 * GET DISTINCT GENRES
 * Route: GET /api/books/genres
 * Access: Admin and Member
 *
 * Returns an alphabetically sorted list of every unique genre in the book catalog.
 * The frontend uses this to populate the Genre filter chips on the discovery page.
 *
 * HOW IT WORKS:
 *   - sequelize.fn("DISTINCT", ...) tells PostgreSQL to return each genre only once
 *   - Even if 50 books are "Fiction", "Fiction" only appears once in the result
 *   - { raw: true } returns plain objects instead of Sequelize model instances
 *     (simpler to work with since we only need the genre string value)
 *
 * @param {object} req - The request object (no params needed)
 * @param {object} res - The response object
 */
const getGenres = async (req, res) => {
  try {

    // Query the database for every distinct genre value in the Books table
    const genreRows = await Book.findAll({
      attributes: [
        // sequelize.fn creates a SQL function call: DISTINCT(genre)
        // The second argument "genre" is the alias used in the result object
        [sequelize.fn("DISTINCT", sequelize.col("genre")), "genre"],
      ],
      raw: true, // return plain JS objects, not Sequelize model instances
    });

    // Extract just the genre string from each result row, filter out nulls, sort A-Z
    const genres = genreRows
      .map(function (row) { return row.genre; })
      .filter(Boolean)  // remove any null or empty values
      .sort();          // alphabetical order

    return res.status(200).json({
      message: "Genres retrieved successfully",
      genres: genres,
    });

  } catch (error) {
    console.error("Get genres error:", error.message);
    return res.status(500).json({
      message: "Something went wrong while fetching genres",
      error: error.message,
    });
  }
};


// Export all controller functions so bookRoutes.js can import and use them
module.exports = {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getGenres,
};
