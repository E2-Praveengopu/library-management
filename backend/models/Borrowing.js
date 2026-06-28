/**
 * BORROWING MODEL
 *
 * This model represents the "Borrowings" table in the database.
 * Each row records one instance of a member borrowing a book.
 *
 * RELATIONSHIPS (set up in server.js):
 *   - A Borrowing belongs to one User  (the member who borrowed it)
 *   - A Borrowing belongs to one Book  (the book that was borrowed)
 *   - A User can have many Borrowings
 *   - A Book can have many Borrowings
 *
 * LIFECYCLE:
 *   1. Member borrows a book  → row created with status = "borrowed"
 *   2. Member returns it      → row updated with status = "returned", returnedAt = now
 *
 * WHAT CHANGES ON THE BOOK SIDE:
 *   When status changes to "borrowed" → book.availableCopies decreases by 1
 *   When status changes to "returned" → book.availableCopies increases by 1
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Borrowing = sequelize.define("Borrowing", {

  /**
   * userId
   * The ID of the member who borrowed this book.
   * Links to the Users table via association defined in server.js.
   */
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  /**
   * bookId
   * The ID of the book that was borrowed.
   * Links to the Books table via association defined in server.js.
   */
  bookId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  /**
   * status
   * Tracks whether the book is still borrowed or has been returned.
   *
   * "borrowed"  → the member currently has this book
   * "returned"  → the member gave it back
   *
   * Using ENUM ensures only these two values are ever stored.
   * A typo like "Borrowed" or "RETURNED" will throw a validation error.
   */
  status: {
    type: DataTypes.ENUM("borrowed", "returned"),
    allowNull: false,
    defaultValue: "borrowed",
  },

  /**
   * dueDate
   * The date by which the member should return the book.
   * Automatically set to 14 days from the borrow date in the controller.
   *
   * allowNull: true so we don't break existing records if this is added later.
   */
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  /**
   * returnedAt
   * The exact timestamp when the member returned the book.
   * null means the book has NOT been returned yet.
   * Set to the current timestamp when the member returns the book.
   */
  returnedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },

});

module.exports = Borrowing;
