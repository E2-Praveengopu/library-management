/**
 * BookListRow Component
 *
 * Displays a single book as a compact horizontal row in the list view.
 *
 * LAYOUT (left to right):
 *   ┌────┬──────────────────────────┬───────────┬────────────────┐
 *   │img │ Title / Author           │ Avail: 3/5│ [Edit][Delete] │
 *   │    │ [Genre] · ISBN: xxx      │           │                │
 *   └────┴──────────────────────────┴───────────┴────────────────┘
 *
 * DIFFERENCE FROM BookCard:
 *   BookCard  → used in grid view (tall vertical cards)
 *   BookListRow → used in list view (compact horizontal rows)
 *   Both receive the same book object and use the same context actions.
 *
 * PROPS:
 *   book {object} — Same book object as BookCard:
 *     { id, title, author, isbn, genre, totalCopies, availableCopies,
 *       coverImage, coverImageUrl }
 *
 * CONTEXT:
 *   Calls openEditForm(book) and openDeleteModal(book) from BookContext.
 */

import React from "react";
import { useBookContext } from "../context/BookContext";
import "../styles/bookCatalog.css";

/**
 * BookListRow functional component.
 *
 * @param {object} props
 * @param {object} props.book - The book data to display
 */
function BookListRow({ book }) {

  const { openEditForm, openDeleteModal } = useBookContext();

  /** Green when copies are available; red when none remain */
  const copiesColorClass = book.availableCopies > 0 ? "copies-available" : "copies-unavailable";

  return (
    <div className="book-list-row">

      {/* ── Small Thumbnail Image ───────────────────────────────── */}
      <div className="book-list-image-wrap">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={`Cover of ${book.title}`}
            className="book-list-image"
            onError={function (e) {
              /* If image fails to load, hide it and show the emoji placeholder */
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}

        {/* Placeholder emoji when there is no cover image */}
        <div
          className="book-list-no-image"
          style={{ display: book.coverImageUrl ? "none" : "flex" }}
        >
          📖
        </div>
      </div>

      {/* ── Book Info (title, author, genre, isbn) ──────────────── */}
      <div className="book-list-info">
        <p className="book-list-title" title={book.title}>
          {book.title}
        </p>
        <p className="book-list-author">{book.author}</p>
        <div className="book-list-meta">
          <span className="book-list-genre">{book.genre}</span>
          <span className="book-list-isbn">ISBN: {book.isbn}</span>
        </div>
      </div>

      {/* ── Available / Total Copies ────────────────────────────── */}
      <div className="book-list-copies">
        <div className={`book-list-copies-avail ${copiesColorClass}`}>
          {book.availableCopies}/{book.totalCopies}
        </div>
        <div className="book-list-copies-label">copies</div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────────── */}
      <div className="book-list-actions">

        <button
          className="btn-list btn-edit"
          onClick={function () { openEditForm(book); }}
          aria-label={`Edit ${book.title}`}
        >
          Edit
        </button>

        <button
          className="btn-list btn-delete"
          onClick={function () { openDeleteModal(book); }}
          aria-label={`Delete ${book.title}`}
        >
          Delete
        </button>

      </div>
    </div>
  );
}

export default BookListRow;
