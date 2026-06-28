/**
 * BookDetailModal Component
 *
 * A full-screen overlay showing complete information about a book
 * and allowing the member to borrow or return it.
 *
 * LAYOUT (desktop — side by side):
 *   ┌──────────────┬──────────────────────────────────┐
 *   │              │  [×]                             │
 *   │  Cover Image │  [Fiction]                       │
 *   │              │  The Great Gatsby                │
 *   │              │  by F. Scott Fitzgerald          │
 *   │              │  ┌──────────────────────────┐   │
 *   │              │  │ ISBN         0-7432-...  │   │
 *   │              │  │ Total Copies      5      │   │
 *   │              │  │ Available     ● 3 / 5    │   │
 *   │              │  │ Added         Jan 2024   │   │
 *   │              │  └──────────────────────────┘   │
 *   │              │  [Borrow Book / Return / N/A]    │
 *   └──────────────┴──────────────────────────────────┘
 *
 * LAYOUT (mobile — stacked):
 *   Image on top, info below.
 *
 * CTA BUTTON STATES:
 *   Not borrowed + available    → "Borrow Book" (blue)
 *   Already borrowed            → "Return Book" (green outline) + due date warning
 *   No copies available         → "Not Available" (grey, disabled)
 *
 * Uses DiscoveryContext for:
 *   selectedBook, closeDetailModal,
 *   handleBorrowBook, handleReturnBook,
 *   getActiveBorrowing, borrowLoading, borrowError, borrowSuccess
 */

import React from "react";
import { useDiscovery } from "../context/DiscoveryContext";
import "../styles/bookDiscovery.css";

/**
 * BookDetailModal functional component.
 * Reads everything it needs from DiscoveryContext — no external props required.
 */
function BookDetailModal() {

  const {
    selectedBook,       // the book whose detail we're showing
    closeDetailModal,
    handleBorrowBook,
    handleReturnBook,
    getActiveBorrowing,
    borrowLoading,
    borrowError,
    borrowSuccess,
  } = useDiscovery();

  // Safety guard — shouldn't happen but prevents crashes
  if (!selectedBook) return null;

  // Check current borrow status for this book
  const activeBorrowing = getActiveBorrowing(selectedBook.id);
  const alreadyBorrowed = activeBorrowing !== null;
  const isAvailable     = selectedBook.availableCopies > 0;

  /**
   * Format a date object or ISO string into a readable format.
   * Example: "15 Jul 2025"
   *
   * @param {string|Date} dateInput
   * @returns {string}
   */
  function formatDate(dateInput) {
    if (!dateInput) return "—";
    const d = new Date(dateInput);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    /* Dark overlay — click outside the card to close */
    <div
      className="detail-modal-overlay"
      onClick={function (e) {
        if (e.target === e.currentTarget) closeDetailModal();
      }}
    >
      <div className="detail-modal-card">
        <div className="detail-modal-inner">

          {/* ── LEFT COLUMN: Cover Image ─────────────────────────── */}
          <div className="detail-modal-image-col">
            {selectedBook.coverImageUrl ? (
              <img
                src={selectedBook.coverImageUrl}
                alt={`Cover of ${selectedBook.title}`}
                className="detail-modal-image"
              />
            ) : (
              <div className="detail-modal-no-image">
                <span className="detail-modal-no-image-icon" role="img" aria-label="Book">📖</span>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Book Info + Actions ────────────────── */}
          <div className="detail-modal-info-col">

            {/* Close button */}
            <button
              className="detail-modal-close"
              onClick={closeDetailModal}
              aria-label="Close"
            >
              ×
            </button>

            {/* Genre chip */}
            <span className="detail-modal-genre">{selectedBook.genre}</span>

            {/* Title */}
            <h2 className="detail-modal-title">{selectedBook.title}</h2>

            {/* Author */}
            <p className="detail-modal-author">by {selectedBook.author}</p>

            {/* Key details table */}
            <div className="detail-modal-details">

              <div className="detail-modal-detail-row">
                <span className="detail-modal-detail-label">ISBN</span>
                <span className="detail-modal-detail-value">{selectedBook.isbn}</span>
              </div>

              <div className="detail-modal-detail-row">
                <span className="detail-modal-detail-label">Total Copies</span>
                <span className="detail-modal-detail-value">{selectedBook.totalCopies}</span>
              </div>

              <div className="detail-modal-detail-row">
                <span className="detail-modal-detail-label">Availability</span>
                <div className="detail-modal-detail-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`detail-avail-dot ${isAvailable ? "dot-available" : "dot-unavailable"}`} />
                  <span>
                    {selectedBook.availableCopies} of {selectedBook.totalCopies} copies available
                  </span>
                </div>
              </div>

              {selectedBook.createdAt && (
                <div className="detail-modal-detail-row">
                  <span className="detail-modal-detail-label">Added</span>
                  <span className="detail-modal-detail-value">{formatDate(selectedBook.createdAt)}</span>
                </div>
              )}

            </div>

            {/* Due date reminder when already borrowed */}
            {alreadyBorrowed && activeBorrowing.dueDate && (
              <div className="detail-due-date">
                📅 Due back by {formatDate(activeBorrowing.dueDate)}
              </div>
            )}

            {/* Error/success feedback banners */}
            {borrowError   && <div className="detail-modal-error">{borrowError}</div>}
            {borrowSuccess && <div className="detail-modal-success">{borrowSuccess}</div>}

            {/* ── Action Button ────────────────────────────────────── */}

            {/* Case 1: Member already has this book — show Return button */}
            {alreadyBorrowed && (
              <button
                className="detail-return-btn"
                onClick={function () { handleReturnBook(activeBorrowing.id); }}
                disabled={borrowLoading}
              >
                {borrowLoading ? "Returning…" : "Return Book"}
              </button>
            )}

            {/* Case 2: Book is available and not yet borrowed — show Borrow button */}
            {!alreadyBorrowed && isAvailable && (
              <button
                className="detail-borrow-btn"
                onClick={function () { handleBorrowBook(selectedBook.id); }}
                disabled={borrowLoading}
              >
                {borrowLoading ? "Borrowing…" : "Borrow Book"}
              </button>
            )}

            {/* Case 3: No copies available and not borrowed — show disabled message */}
            {!alreadyBorrowed && !isAvailable && (
              <div className="detail-unavail-msg">
                All copies are currently borrowed
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetailModal;
