/**
 * BookDiscovery Page Component
 *
 * The member-facing book browsing and discovery experience.
 *
 * WHAT THIS PAGE OFFERS:
 *   - A gradient hero banner with a live search bar
 *   - Genre filter chips that instantly filter the book grid
 *   - "Available only" toggle to surface only borrowable books
 *   - Responsive grid or list view of book cards
 *   - Skeleton loading cards while books are fetching
 *   - Empty state when no books match the search/filters
 *   - Pagination at the bottom
 *   - A detail modal when a book card is clicked (shows full info + borrow CTA)
 *
 * PAGE LAYOUT:
 *   ┌─────────────────────────────────────────┐
 *   │ [LIBRARY] | Book Discovery   [Back][Out]│  ← nav
 *   ├─────────────────────────────────────────┤
 *   │       Discover Your Next Read           │
 *   │     🔍 [ Search books...  ]             │  ← hero
 *   ├─────────────────────────────────────────┤
 *   │ [All] [Fiction] [Sci-Fi] [History] ...  │  ← genre chips
 *   │ 42 books  [Available only □] [⊞][☰]    │  ← filter bar
 *   │                                         │
 *   │ [Card] [Card] [Card] [Card]             │  ← book grid
 *   │ [Card] [Card] [Card] [Card]             │
 *   │                                         │
 *   │ [← Prev]  [1][2][3]  [Next →]          │  ← pagination
 *   └─────────────────────────────────────────┘
 *   (BookDetailModal overlays when a card is clicked)
 *
 * CONTEXT:
 *   Wrapped in <DiscoveryProvider> in App.jsx.
 *   All data and actions come from useDiscovery().
 *
 * ACCESS CONTROL:
 *   Protected by ProtectedRoute with requiredRole="member".
 *   Admins are redirected to login; unauthenticated users too.
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { useDiscovery } from "../context/DiscoveryContext";

// Sub-components
import SearchBar       from "../components/SearchBar";
import GenreFilter     from "../components/GenreFilter";
import MemberBookCard  from "../components/MemberBookCard";
import SkeletonCard    from "../components/SkeletonCard";
import BookDetailModal from "../components/BookDetailModal";

// Styles
import "../styles/auth.css";         // reuse .logout-button
import "../styles/bookDiscovery.css";

/**
 * BookDiscovery functional component.
 * Composes the hero, filters, book grid, and modals into the full page.
 */
function BookDiscovery() {

  const navigate = useNavigate();
  const user = getUser();

  // All state and actions come from DiscoveryContext
  const {
    books,
    pagination,
    genres,
    loading,
    error,
    searchQuery,
    selectedGenre,
    availableOnly,
    viewMode,
    selectedBook,
    setViewMode,
    handleSearchChange,
    handleGenreSelect,
    handleAvailableToggle,
    handlePageChange,
  } = useDiscovery();

  /** Clears auth data and sends the user back to the login page. */
  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  /**
   * Builds the page-number list for pagination (up to 5 visible at a time).
   * Returns an array of page numbers to render as buttons.
   */
  function getPageNumbers() {
    const MAX = 5;
    const total = pagination.totalPages || 1;
    const current = pagination.currentPage || 1;

    if (total <= MAX) return Array.from({ length: total }, function (_, i) { return i + 1; });

    let start = Math.max(1, current - 2);
    let end   = Math.min(total, start + MAX - 1);
    start     = Math.max(1, end - MAX + 1);

    return Array.from({ length: end - start + 1 }, function (_, i) { return start + i; });
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="discovery-page">

      {/* ================================================================
          STICKY NAVIGATION BAR
          ================================================================ */}
      <nav className="discovery-nav">
        <div className="discovery-nav-left">
          <span className="discovery-nav-logo">Library</span>
          <div className="discovery-nav-divider" />
          <span className="discovery-nav-page">Book Discovery</span>
        </div>
        <div className="discovery-nav-right">
          <span className="discovery-nav-user">
            {user ? `Hello, ${user.name}` : "Member"}
          </span>
          <Link to="/member/dashboard" className="discovery-nav-back">
            Dashboard
          </Link>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ================================================================
          HERO SECTION — gradient banner with title and search bar
          ================================================================ */}
      <header className="discovery-hero">

        <h1 className="discovery-hero-title">
          Discover Your Next Read
        </h1>

        <p className="discovery-hero-subtitle">
          {pagination.totalBooks > 0
            ? `Explore our collection of ${pagination.totalBooks} book${pagination.totalBooks !== 1 ? "s" : ""}`
            : "Explore our library collection"}
        </p>

        {/* Live search bar */}
        <SearchBar
          value={searchQuery}
          onSearch={handleSearchChange}
        />

      </header>

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <main className="discovery-content">

        {/* Genre filter chips */}
        <GenreFilter
          genres={genres}
          selectedGenre={selectedGenre}
          onGenreSelect={handleGenreSelect}
        />

        {/* Filter bar: results count + available toggle + view mode */}
        {!loading && books.length >= 0 && (
          <div className="discovery-filter-bar">

            <span className="discovery-results-count">
              {pagination.totalBooks > 0
                ? `${pagination.totalBooks} book${pagination.totalBooks !== 1 ? "s" : ""} found · Page ${pagination.currentPage} of ${pagination.totalPages}`
                : "No books match your search"}
            </span>

            <div className="discovery-filter-bar-right">

              {/* Available only checkbox */}
              <label className="avail-toggle-label">
                <input
                  type="checkbox"
                  className="avail-toggle-input"
                  checked={availableOnly}
                  onChange={handleAvailableToggle}
                />
                Available only
              </label>

              {/* Grid / List view toggle */}
              <div className="discovery-view-toggle" role="group" aria-label="View mode">
                <button
                  className={`discovery-view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={function () { setViewMode("grid"); }}
                  aria-pressed={viewMode === "grid"}
                >
                  ⊞ Grid
                </button>
                <button
                  className={`discovery-view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={function () { setViewMode("list"); }}
                  aria-pressed={viewMode === "list"}
                >
                  ☰ List
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Error banner */}
        {error && <div className="discovery-error">{error}</div>}

        {/* ── Skeleton Cards (loading state) ──────────────────── */}
        {loading && (
          <div className="discovery-grid">
            {Array.from({ length: 12 }).map(function (_, i) {
              return <SkeletonCard key={i} />;
            })}
          </div>
        )}

        {/* ── Empty State (no results) ─────────────────────────── */}
        {!loading && !error && books.length === 0 && (
          <div className="discovery-empty">
            <span className="discovery-empty-icon" role="img" aria-label="No books">🔍</span>
            <h2>No Books Found</h2>
            <p>
              {searchQuery
                ? `We couldn't find any books matching "${searchQuery}".`
                : selectedGenre
                  ? `No books in the "${selectedGenre}" genre${availableOnly ? " are currently available" : ""}.`
                  : "The library doesn't have any books yet."}
            </p>
            <button
              className="discovery-empty-reset"
              onClick={function () {
                handleSearchChange("");
                handleGenreSelect("");
                if (availableOnly) handleAvailableToggle();
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* ── Book Grid View ───────────────────────────────────── */}
        {!loading && books.length > 0 && viewMode === "grid" && (
          <div className="discovery-grid">
            {books.map(function (book) {
              return <MemberBookCard key={book.id} book={book} />;
            })}
          </div>
        )}

        {/* ── Book List View ───────────────────────────────────── */}
        {!loading && books.length > 0 && viewMode === "list" && (
          <div className="discovery-list">
            {books.map(function (book) {
              return <MemberListRow key={book.id} book={book} />;
            })}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────── */}
        {!loading && pagination.totalPages > 1 && (
          <div className="discovery-pagination">

            {/* ← Previous */}
            <button
              className="discovery-pagination-btn"
              onClick={function () { handlePageChange(pagination.currentPage - 1); }}
              disabled={!pagination.hasPreviousPage}
            >
              ← Prev
            </button>

            {/* First page shortcut */}
            {pageNumbers[0] > 1 && (
              <>
                <button className="discovery-pagination-page" onClick={function () { handlePageChange(1); }}>1</button>
                {pageNumbers[0] > 2 && <span className="discovery-pagination-dots">…</span>}
              </>
            )}

            {/* Page number buttons */}
            {pageNumbers.map(function (n) {
              return (
                <button
                  key={n}
                  className={`discovery-pagination-page ${n === pagination.currentPage ? "active" : ""}`}
                  onClick={function () { handlePageChange(n); }}
                >
                  {n}
                </button>
              );
            })}

            {/* Last page shortcut */}
            {pageNumbers[pageNumbers.length - 1] < pagination.totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < pagination.totalPages - 1 && (
                  <span className="discovery-pagination-dots">…</span>
                )}
                <button
                  className="discovery-pagination-page"
                  onClick={function () { handlePageChange(pagination.totalPages); }}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            {/* Next → */}
            <button
              className="discovery-pagination-btn"
              onClick={function () { handlePageChange(pagination.currentPage + 1); }}
              disabled={!pagination.hasNextPage}
            >
              Next →
            </button>

          </div>
        )}

      </main>

      {/* Book Detail Modal — shown when selectedBook is not null */}
      {selectedBook && <BookDetailModal />}

    </div>
  );
}


/**
 * MemberListRow — inline list-view row for the list toggle.
 *
 * Defined in the same file because it's so small and only used here.
 * Uses DiscoveryContext directly for openDetailModal and borrow status.
 *
 * @param {object} props.book - The book data
 */
function MemberListRow({ book }) {
  const { openDetailModal, getActiveBorrowing } = useDiscovery();
  const alreadyBorrowed = getActiveBorrowing(book.id) !== null;
  const isAvailable     = book.availableCopies > 0;

  return (
    <div
      className="member-list-row"
      onClick={function () { openDetailModal(book); }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${book.title}`}
      onKeyDown={function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetailModal(book); }
      }}
    >
      {/* Thumbnail */}
      <div className="member-list-thumb">
        {book.coverImageUrl
          ? <img src={book.coverImageUrl} alt={book.title} className="member-list-thumb-img" />
          : <div className="member-list-thumb-placeholder">📖</div>
        }
      </div>

      {/* Info */}
      <div className="member-list-info">
        <p className="member-list-title" title={book.title}>{book.title}</p>
        <p className="member-list-author">{book.author}</p>
        <div className="member-list-tags">
          <span className="member-list-genre-tag">{book.genre}</span>
          <span className="member-list-isbn">ISBN: {book.isbn}</span>
        </div>
      </div>

      {/* Right: badge + copies + action */}
      <div className="member-list-right">
        <span className={`member-list-avail-badge ${isAvailable ? "badge-available" : "badge-unavailable"}`}>
          {isAvailable ? "Available" : "Unavailable"}
        </span>
        <span className="member-list-copies">{book.availableCopies}/{book.totalCopies} copies</span>
        <button
          className="member-list-view-btn"
          onClick={function (e) { e.stopPropagation(); openDetailModal(book); }}
        >
          {alreadyBorrowed ? "Borrowed ✓" : "View"}
        </button>
      </div>
    </div>
  );
}


export default BookDiscovery;
