/**
 * MemberBookCard Component
 *
 * A visually rich book card for the member Book Discovery grid view.
 *
 * VISUAL DESIGN:
 *   - Tall cover image (200px) with a gradient fade at the bottom
 *   - Availability badge overlaid on the top-right corner of the image
 *   - Smooth scale-up and shadow-deepen on hover
 *   - Genre badge and copy count below the image
 *   - CTA button changes based on borrow status:
 *       Available + not borrowed → "Borrow Book" (solid blue)
 *       Already borrowed         → "Already Borrowed ✓" (green outline)
 *       No copies available      → "Not Available" (greyed out)
 *
 * CLICKING:
 *   Clicking the card anywhere (or the CTA button) opens the BookDetailModal
 *   so the member can read full details before borrowing.
 *
 * Props:
 *   book {object} - A book object from the backend:
 *     { id, title, author, isbn, genre, totalCopies, availableCopies, coverImageUrl }
 *
 * Uses DiscoveryContext for: openDetailModal, getActiveBorrowing
 */

import React from "react";
import { useDiscovery } from "../context/DiscoveryContext";
import "../styles/bookDiscovery.css";

/**
 * MemberBookCard functional component.
 *
 * @param {object} props
 * @param {object} props.book - The book data to display
 */
function MemberBookCard({ book }) {

  const { openDetailModal, getActiveBorrowing } = useDiscovery();

  // Check if the member currently has this book borrowed
  const activeBorrowing = getActiveBorrowing(book.id);
  const alreadyBorrowed = activeBorrowing !== null;
  const isAvailable = book.availableCopies > 0;

  /**
   * Determines the label and CSS class for the main CTA button.
   * Priority: already borrowed > available > unavailable
   */
  function getCTAProps() {
    if (alreadyBorrowed) {
      return { label: "Already Borrowed ✓", className: "member-book-cta cta-borrowed" };
    }
    if (isAvailable) {
      return { label: "View & Borrow", className: "member-book-cta" };
    }
    return { label: "Not Available", className: "member-book-cta cta-unavailable" };
  }

  const cta = getCTAProps();

  return (
    <div
      className="member-book-card"
      onClick={function () { openDetailModal(book); }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${book.title}`}
      onKeyDown={function (e) {
        // Allow keyboard users to open the modal with Enter or Space
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetailModal(book);
        }
      }}
    >

      {/* ── Cover Image with overlay badges ────────────────────── */}
      <div className="member-book-image-wrap">

        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={`Cover of ${book.title}`}
            className="member-book-image"
            onError={function (e) {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "none"; /* hide gradient too */
              e.target.parentElement.querySelector(".member-book-no-image").style.display = "flex";
            }}
          />
        ) : null}

        {/* Gradient fade at bottom of image */}
        {book.coverImageUrl && (
          <div className="member-book-image-gradient" aria-hidden="true" />
        )}

        {/* Placeholder for no image */}
        <div
          className="member-book-no-image"
          style={{ display: book.coverImageUrl ? "none" : "flex" }}
        >
          <span className="member-book-no-image-icon" role="img" aria-label="Book">📖</span>
          <span className="member-book-no-image-text">No Cover</span>
        </div>

        {/* Availability badge: top-right corner */}
        <span
          className={`member-book-avail-badge ${isAvailable ? "badge-available" : "badge-unavailable"}`}
        >
          {isAvailable ? `${book.availableCopies} Available` : "Unavailable"}
        </span>

      </div>

      {/* ── Card Body ───────────────────────────────────────────── */}
      <div className="member-book-body">

        {/* Title (clamped to 2 lines) */}
        <h3 className="member-book-title" title={book.title}>
          {book.title}
        </h3>

        {/* Author */}
        <p className="member-book-author">{book.author}</p>

        {/* Genre badge + copies count */}
        <div className="member-book-meta">
          <span className="member-book-genre" title={book.genre}>
            {book.genre}
          </span>
          <span className="member-book-copies">
            {book.availableCopies}/{book.totalCopies}
          </span>
        </div>

        {/* CTA button */}
        <button
          className={cta.className}
          onClick={function (e) {
            e.stopPropagation(); // don't bubble to the card's onClick
            openDetailModal(book);
          }}
          disabled={!isAvailable && !alreadyBorrowed}
          aria-label={`${cta.label}: ${book.title}`}
        >
          {cta.label}
        </button>

      </div>
    </div>
  );
}

export default MemberBookCard;
