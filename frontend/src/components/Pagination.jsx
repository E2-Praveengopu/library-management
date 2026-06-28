/**
 * Pagination Component
 *
 * Displays a row of page navigation controls at the bottom of the book list.
 *
 * WHAT IT SHOWS:
 *   [← Prev]  [1] [2] [3] [4] [5]  [Next →]
 *   "Showing page 2 of 5"
 *
 * HOW IT WORKS:
 *   - Prev button is disabled on page 1
 *   - Next button is disabled on the last page
 *   - Page numbers are rendered dynamically based on totalPages
 *   - Clicking any button calls onPageChange(pageNumber)
 *   - If there are too many pages (> 5), we only show a window of page numbers
 *     around the current page to avoid cluttering the UI
 *
 * Props (received from BookCatalog.jsx):
 *   currentPage  {number}   - The page currently being viewed (1-based)
 *   totalPages   {number}   - Total number of pages
 *   hasNextPage  {boolean}  - Whether a next page exists
 *   hasPrevPage  {boolean}  - Whether a previous page exists
 *   onPageChange {function} - Called with the new page number when user clicks
 *
 * CONTEXT:
 *   This is a "presentational" (dumb) component — it has no state of its own
 *   and does not call any APIs. It just receives data and reports clicks upward.
 */

import React from "react";
import "../styles/bookCatalog.css";

/**
 * Pagination functional component.
 *
 * Receives all data it needs via props — no context needed here since the
 * parent (BookCatalog) passes these values directly and there is no deep tree.
 */
function Pagination({ currentPage, totalPages, hasNextPage, hasPrevPage, onPageChange }) {

  // If there is only one page (or none), there is nothing to paginate — hide it
  if (totalPages <= 1) {
    return null;
  }

  /**
   * Calculates which page numbers to display as clickable buttons.
   *
   * Strategy: show at most 5 page numbers centered around the current page.
   * Example: on page 7 of 20, show [5] [6] [7] [8] [9]
   *
   * @returns {number[]} - Array of page numbers to render
   */
  function getPageNumbers() {
    const MAX_VISIBLE = 5;

    // If total pages is small enough, just show them all
    if (totalPages <= MAX_VISIBLE) {
      return Array.from({ length: totalPages }, function (_, i) { return i + 1; });
    }

    // Calculate the start and end of the visible window
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + MAX_VISIBLE - 1);

    // Adjust start if end was clamped to totalPages
    start = Math.max(1, end - MAX_VISIBLE + 1);

    return Array.from({ length: end - start + 1 }, function (_, i) { return start + i; });
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination">

      {/* ← Previous page button */}
      <button
        className="pagination-btn"
        onClick={function () { onPageChange(currentPage - 1); }}
        disabled={!hasPrevPage}
        aria-label="Go to previous page"
      >
        ← Prev
      </button>

      {/* First page shortcut — show "1 …" when the window doesn't start at 1 */}
      {pageNumbers[0] > 1 && (
        <>
          <button
            className="pagination-page"
            onClick={function () { onPageChange(1); }}
          >
            1
          </button>
          {/* Ellipsis dots if there is a gap between page 1 and the window start */}
          {pageNumbers[0] > 2 && (
            <span className="pagination-info">…</span>
          )}
        </>
      )}

      {/* The main window of page number buttons */}
      {pageNumbers.map(function (pageNum) {
        return (
          <button
            key={pageNum}
            className={`pagination-page ${pageNum === currentPage ? "active" : ""}`}
            onClick={function () { onPageChange(pageNum); }}
            aria-label={`Go to page ${pageNum}`}
            aria-current={pageNum === currentPage ? "page" : undefined}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Last page shortcut — show "… N" when the window doesn't reach the last page */}
      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {/* Ellipsis dots if there is a gap between window end and last page */}
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className="pagination-info">…</span>
          )}
          <button
            className="pagination-page"
            onClick={function () { onPageChange(totalPages); }}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next page → button */}
      <button
        className="pagination-btn"
        onClick={function () { onPageChange(currentPage + 1); }}
        disabled={!hasNextPage}
        aria-label="Go to next page"
      >
        Next →
      </button>

    </div>
  );
}

export default Pagination;
