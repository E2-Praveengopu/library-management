/**
 * BookCatalog Page Component
 *
 * The main admin page for managing the book collection.
 *
 * WHAT THIS PAGE DOES:
 *   - Shows all books in a paginated grid or list layout
 *   - Provides an "Add Book" button to open the creation form
 *   - Each book has Edit and Delete action buttons
 *   - Allows toggling between grid (card) and list (row) views
 *   - Displays loading spinner and error messages
 *
 * STRUCTURE:
 *   ┌──────────────────────────────────────────────┐
 *   │  [LIBRARY]  |  Book Catalog          [Back] [Logout]  │  ← sticky nav bar
 *   ├──────────────────────────────────────────────┤
 *   │  Book Catalog                  [+ Add Book]  │  ← toolbar
 *   │  42 books                  [⊞ Grid] [☰ List]│  ← filter bar
 *   │                                              │
 *   │  [Card][Card][Card]                          │  ← book grid
 *   │  [Card][Card][Card]                          │
 *   │                                              │
 *   │  [← Prev]  [1][2][3]  [Next →]              │  ← pagination
 *   └──────────────────────────────────────────────┘
 *   (Modals appear on top of this when opened)
 *
 * CONTEXT:
 *   All data and actions come from BookContext (via useBookContext).
 *   This page is wrapped in <BookProvider> in App.jsx, so it and all
 *   its children can access the shared book state.
 *
 * ACCESS CONTROL:
 *   Protected by ProtectedRoute in App.jsx — only "admin" role can reach this.
 *   If a non-admin visits /admin/books, they are redirected to the login page.
 */

import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { useBookContext } from "../context/BookContext";
import BookCard from "../components/BookCard";
import BookListRow from "../components/BookListRow";
import BookForm from "../components/BookForm";
import DeleteModal from "../components/DeleteModal";
import Pagination from "../components/Pagination";
import "../styles/auth.css";
import "../styles/bookCatalog.css";

/**
 * BookCatalog functional component.
 *
 * This is a "container" component — it composes the smaller pieces
 * (nav, toolbar, grid/list, pagination, modals) into a full page.
 * Most of the logic lives in BookContext; this page just wires things together.
 */
function BookCatalog() {

  const navigate = useNavigate();

  // Get the logged-in user's name for the nav bar greeting
  const user = getUser();

  // Pull everything we need from the shared BookContext
  const {
    books,
    pagination,
    loading,
    error,
    currentPage,
    viewMode,
    showForm,
    showDeleteModal,
    setViewMode,
    loadBooks,
    openAddForm,
  } = useBookContext();

  /**
   * successMessage: a brief "Book added successfully!" message.
   * We use a ref instead of state so it doesn't cause an extra re-render.
   * We set it to a string after a successful add/edit from within the form,
   * then clear it after 3 seconds.
   */
  const [successMessage, setSuccessMessage] = React.useState("");

  /**
   * Auto-clear the success message after 3 seconds.
   * useEffect re-runs whenever successMessage changes.
   */
  useEffect(function () {
    if (!successMessage) return;

    const timer = setTimeout(function () {
      setSuccessMessage("");
    }, 3000);

    // Clean up the timer if successMessage changes before 3s
    return function () { clearTimeout(timer); };
  }, [successMessage]);

  /**
   * Logs the user out by clearing localStorage and redirecting to login.
   */
  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  /**
   * Called when the user clicks a page number or Prev/Next in the pagination.
   * Tells the context to load a different page of books.
   *
   * @param {number} page - The page number to navigate to
   */
  function handlePageChange(page) {
    loadBooks(page);
    // Scroll to the top of the page so the user sees the new books
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="catalog-page">

      {/* ================================================================
          STICKY NAVIGATION BAR
          Shows logo, breadcrumb, user name, back link, and logout button.
          ================================================================ */}
      <nav className="catalog-nav">

        {/* Left: Logo + separator + page name */}
        <div className="catalog-nav-left">
          <span className="catalog-nav-logo">Library</span>
          <div className="catalog-nav-divider" />
          <span className="catalog-nav-page">Book Catalog</span>
        </div>

        {/* Right: user greeting + dashboard link + logout */}
        <div className="catalog-nav-right">

          <span className="catalog-nav-user">
            {user ? `Hello, ${user.name}` : "Admin"}
          </span>

          <Link to="/admin/dashboard" className="catalog-nav-back">
            Dashboard
          </Link>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>

        </div>
      </nav>

      {/* ================================================================
          MAIN CONTENT
          Everything below the nav bar.
          ================================================================ */}
      <main className="catalog-content">

        {/* ── Toolbar: Title + Add Book Button ──────────────────── */}
        <div className="catalog-toolbar">
          <div className="catalog-toolbar-left">
            <h1>Book Catalog</h1>
            <p>
              {pagination.totalBooks > 0
                ? `${pagination.totalBooks} book${pagination.totalBooks !== 1 ? "s" : ""} in the library`
                : "No books yet — add one to get started"}
            </p>
          </div>

          {/* Opens the Add Book form modal */}
          <button className="btn-add-book" onClick={openAddForm}>
            <span className="btn-icon" aria-hidden="true">+</span>
            Add Book
          </button>
        </div>

        {/* ── Success notification ───────────────────────────────── */}
        {successMessage && (
          <div className="catalog-success">{successMessage}</div>
        )}

        {/* ── Error notification ─────────────────────────────────── */}
        {error && (
          <div className="catalog-error">{error}</div>
        )}

        {/* ── Filter Bar: book count + view toggle ──────────────── */}
        {!loading && books.length > 0 && (
          <div className="catalog-filter-bar">

            <span className="catalog-book-count">
              Showing page {pagination.currentPage} of {pagination.totalPages}
              {" "}({pagination.totalBooks} total)
            </span>

            {/* Grid / List toggle buttons */}
            <div className="view-toggle" role="group" aria-label="View mode">
              <button
                className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={function () { setViewMode("grid"); }}
                aria-pressed={viewMode === "grid"}
              >
                ⊞ Grid
              </button>
              <button
                className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={function () { setViewMode("list"); }}
                aria-pressed={viewMode === "list"}
              >
                ☰ List
              </button>
            </div>

          </div>
        )}

        {/* ── Loading Spinner ────────────────────────────────────── */}
        {loading && (
          <div className="catalog-loading">
            <div className="catalog-spinner" aria-hidden="true" />
            <p>Loading books…</p>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────── */}
        {!loading && !error && books.length === 0 && (
          <div className="catalog-empty">
            <span className="catalog-empty-icon" role="img" aria-label="Books">📚</span>
            <h2>No Books Yet</h2>
            <p>Start building your library by adding the first book.</p>
            <button className="btn-add-book" onClick={openAddForm}>
              <span className="btn-icon" aria-hidden="true">+</span>
              Add Your First Book
            </button>
          </div>
        )}

        {/* ── Book Grid ─────────────────────────────────────────── */}
        {!loading && books.length > 0 && viewMode === "grid" && (
          <div className="book-grid">
            {books.map(function (book) {
              return <BookCard key={book.id} book={book} />;
            })}
          </div>
        )}

        {/* ── Book List ─────────────────────────────────────────── */}
        {!loading && books.length > 0 && viewMode === "list" && (
          <div className="book-list">
            {books.map(function (book) {
              return <BookListRow key={book.id} book={book} />;
            })}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {!loading && books.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPreviousPage}
            onPageChange={handlePageChange}
          />
        )}

      </main>

      {/* ================================================================
          MODALS
          Rendered here (at the top of the tree) so they appear above
          all other content via z-index. They are conditionally rendered
          based on showForm and showDeleteModal from BookContext.
          ================================================================ */}

      {/* Add / Edit book form modal */}
      {showForm && <BookForm />}

      {/* Delete confirmation modal */}
      {showDeleteModal && <DeleteModal />}

    </div>
  );
}

export default BookCatalog;
