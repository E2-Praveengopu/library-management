const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * BOOK MODEL
 *
 * A "model" in Sequelize is a JavaScript object that represents
 * a table in the database.
 *
 * When the server starts, Sequelize reads this model and automatically
 * creates a table called "Books" in PostgreSQL if it does not already exist.
 * Every property we define here becomes a column in that table.
 *
 * Think of a model like a blueprint or a form — it describes the shape
 * of every book record that will be stored in the database.
 */

const Book = sequelize.define("Book", {

  /**
   * title
   * The name of the book.
   * Example: "The Great Gatsby"
   *
   * allowNull: false means this field is REQUIRED.
   * If you try to save a book without a title, Sequelize will throw an error.
   */
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  /**
   * author
   * The person who wrote the book.
   * Example: "F. Scott Fitzgerald"
   *
   * allowNull: false means this field is REQUIRED.
   */
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  /**
   * isbn
   * ISBN stands for "International Standard Book Number".
   * It is a unique code assigned to every published book edition.
   * Example: "978-0-7432-7356-5"
   *
   * unique: true means no two books in the database can have the same ISBN.
   * If you try to add a book with a duplicate ISBN, the database will reject it.
   */
  isbn: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  /**
   * genre
   * The category or type of the book.
   * Examples: "Fiction", "Non-Fiction", "Science", "History", "Biography"
   *
   * allowNull: false means this field is REQUIRED.
   */
  genre: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  /**
   * totalCopies
   * How many physical copies of this book the library owns in total.
   * This number stays the same whether books are borrowed or not.
   * Example: The library bought 5 copies → totalCopies = 5
   *
   * defaultValue: 1 — if the admin doesn't specify a number, it defaults to 1.
   * validate.min: 1 — you cannot have 0 or negative copies.
   */
  totalCopies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  },

  /**
   * availableCopies
   * How many copies are currently sitting on the shelf (not borrowed).
   *
   * This changes over time:
   *   - When a member borrows a book → availableCopies goes DOWN by 1
   *   - When they return it         → availableCopies goes UP by 1
   *
   * Rule: availableCopies can never be GREATER than totalCopies.
   * Rule: availableCopies can be 0 (all copies are borrowed, none left).
   * Rule: availableCopies cannot be NEGATIVE.
   */
  availableCopies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0,
    },
  },

  /**
   * coverImage
   * The filename of the book cover photo uploaded by the admin.
   * Only the filename is stored here, NOT the full URL.
   *
   * Example stored value: "book-1712345678-987654321.jpg"
   *
   * To view the image in a browser, combine with the server address:
   * http://localhost:5000/uploads/books/book-1712345678-987654321.jpg
   *
   * allowNull: true means a cover image is OPTIONAL.
   * A book can be added to the catalog without a photo.
   */
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },

});

module.exports = Book;
