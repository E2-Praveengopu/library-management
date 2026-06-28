/**
 * BookCard Component
 *
 * Displays a single book as a vertical card in the grid view.
 *
 * LAYOUT (top to bottom):
 *   ┌─────────────────┐
 *   │   Cover Image   │  ← 180px tall, object-fit: cover
 *   ├─────────────────┤
 *   │ Title           │  ← bold, clamped to 2 lines
 *   │ Author          │  ← secondary text
 *   │ [Genre Badge]   │  ← blue pill
 *   │ ISBN: xxx       │  ← small grey text
 *   │ Avail: 3 / 5   │  ← green if available, red if 0
 *   ├─────────────────┤
 *   │ [Edit] [Delete] │  ← outline buttons
 *   └─────────────────┘
 *
 * PROPS:
 *   book {object} — A single book object from the backend:
 *     { id, title, author, isbn, genre, totalCopies, availableCopies,
 *       coverImage, coverImageUrl, createdAt, updatedAt }
 *
 * CONTEXT:
 *   Calls openEditForm(book) and openDeleteModal(book) from BookContext
 *   when the Edit/Delete buttons are clicked.
 *   No data fetching happens here — this is a pure display component.
 */

import React from "react";
import { useBookContext } from "../context/BookContext";
import "../styles/bookCatalog.css";

/**
 * BookCard functional component.
 *
 * @param {object} props
 * @param {object} props.book - The book data to display
 */
function BookCard({ book }) {

  // We only need the two action openers from context
  const { openEditForm, openDeleteModal } = useBookContext();

  /**
   * Determines the CSS class for the available copies number.
   * Green when copies are available, red when the book is out of stock.
   *
   * @returns {string} CSS class name
   */
  function copiesColorClass() {
    return book.availableCopies > 0 ? "copies-available" : "copies-unavailable";
  }

  return (
    <div className="book-card">

      {/* ── Cover Image Section ──────────────────────────────────── */}
      <div className="book-card-image-wrap">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={`Cover of ${book.title}`}
            className="book-card-image"
            /* If the image fails to load, swap it for the placeholder */
            onError={function (e) {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}

        {/* Placeholder shown when there is no image (or if image fails to load) */}
        <div
          className="book-card-no-image"
          style={{ display: book.coverImageUrl ? "none" : "flex" }}
        >
          <span role="img" aria-label="Book">📖</span>
          <p>No Cover</p>
        </div>
      </div>

      {/* ── Book Details Body ────────────────────────────────────── */}
      <div className="book-card-body">

        {/* Book title — clamped to 2 lines with CSS */}
        <h3 className="book-card-title" title={book.title}>
          {book.title}
        </h3>

        {/* Author */}
        <p className="book-card-author">{book.author}</p>

        {/* Genre badge */}
        <span className="book-genre-badge">{book.genre}</span>

        {/* ISBN */}
        <p className="book-card-isbn">ISBN: {book.isbn}</p>

        {/* Available / Total copies */}
        <div className="book-copies">
          <span className="book-copies-label">Available:</span>
          <span className={`book-copies-avail ${copiesColorClass()}`}>
            {book.availableCopies}
          </span>
          <span className="book-copies-label">/ {book.totalCopies}</span>
        </div>

        <hr className="book-card-divider" />

        {/* ── Action Buttons ───────────────────────────────────────── */}
        <div className="book-card-actions">

          {/* Edit button — opens the form pre-filled with this book's data */}
          <button
            className="btn-card btn-edit"
            onClick={function () { openEditForm(book); }}
            aria-label={`Edit ${book.title}`}
          >
            Edit
          </button>

          {/* Delete button — opens the confirmation dialog */}
          <button
            className="btn-card btn-delete"
            onClick={function () { openDeleteModal(book); }}
            aria-label={`Delete ${book.title}`}
          >
            Delete
          </button>

        </div>
      </div>
    </div>
  );
}

export default BookCard;
