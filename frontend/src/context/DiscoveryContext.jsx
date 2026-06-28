/**
 * DiscoveryContext.jsx
 *
 * Shared state store for the Book Discovery page (member-facing).
 *
 * WHY A SEPARATE CONTEXT FROM BookContext?
 *   BookContext is for admin CRUD operations (add/edit/delete books).
 *   DiscoveryContext is for members BROWSING — it tracks search input,
 *   genre filters, borrow actions, and the member's own borrowing history.
 *   Keeping them separate means each page only loads the state it needs.
 *
 * STATE MANAGED HERE:
 *   books          → the current page of search results
 *   pagination     → total count, pages, prev/next
 *   genres         → all genre names for the filter chips
 *   loading        → true while fetching books (shows skeleton cards)
 *   error          → error message string if something went wrong
 *   searchQuery    → what the user typed into the search bar (controlled input)
 *   selectedGenre  → the active genre filter chip ("" = All)
 *   availableOnly  → whether to show only books with copies available
 *   viewMode       → "grid" or "list"
 *   selectedBook   → the book whose detail modal is open (null = closed)
 *   myBorrowings   → the member's active borrowing records (for "already borrowed" check)
 *   borrowLoading  → true while a borrow/return API call is in progress
 *
 * LIVE SEARCH IMPLEMENTATION:
 *   We use a "debounce" pattern: after the user stops typing for 350ms,
 *   we send the search request. This avoids sending a request for every
 *   single keystroke (which would flood the server).
 *
 *   useRef holds a timer ID so we can cancel the previous timer on each keystroke.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { searchBooks, getGenres } from "../services/bookService";
import { borrowBook, returnBook, getMyBorrowings } from "../services/borrowService";

// Create the context (starts empty — filled in by DiscoveryProvider below)
const DiscoveryContext = createContext(null);

/**
 * Custom hook for consuming the discovery context.
 * Any component inside DiscoveryProvider can call this to get shared state.
 *
 * Usage: const { books, loading, handleBorrowBook } = useDiscovery();
 */
export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error("useDiscovery must be used inside <DiscoveryProvider>");
  return ctx;
}

/**
 * DiscoveryProvider Component
 *
 * Wraps the /member/books route in App.jsx.
 * Provides all book discovery state and actions to child components.
 *
 * Props:
 *   children — the React component tree inside this provider
 */
export function DiscoveryProvider({ children }) {

  // ── Book list state ──────────────────────────────────────────────────────────
  const [books, setBooks]             = useState([]);
  const [pagination, setPagination]   = useState({
    currentPage: 1, totalPages: 1, totalBooks: 0,
    booksPerPage: 12, hasNextPage: false, hasPreviousPage: false,
  });
  const [genres, setGenres]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // ── Filter / search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState(""); // raw value bound to the input
  const [selectedGenre, setSelectedGenre] = useState(""); // "" means "All Genres"
  const [availableOnly, setAvailableOnly] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode]       = useState("grid");
  const [selectedBook, setSelectedBook] = useState(null); // for detail modal

  // ── Borrow/return state ──────────────────────────────────────────────────────
  const [myBorrowings, setMyBorrowings] = useState([]); // member's active borrowings
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowError, setBorrowError]   = useState("");
  const [borrowSuccess, setBorrowSuccess] = useState("");

  // A ref holds the debounce timer ID so we can cancel it on each new keystroke
  const searchTimerRef = useRef(null);

  // ── Initial data load ────────────────────────────────────────────────────────

  /**
   * On first mount: load first page of books, all genres, and member's borrowings.
   * The empty [] means this runs only once when the page first appears.
   */
  useEffect(function () {
    fetchBooks(1, "", "", false);
    fetchGenres();
    fetchMyBorrowings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching functions ──────────────────────────────────────────────────

  /**
   * Fetches books from the backend with the given filters.
   * All filter parameters are passed explicitly — no stale closure issues.
   *
   * @param {number}  page      - Page to load (1-based)
   * @param {string}  search    - Search query string
   * @param {string}  genre     - Genre to filter by ("" = all)
   * @param {boolean} available - If true, only show books with copies available
   */
  async function fetchBooks(page, search, genre, available) {
    setLoading(true);
    setError("");

    try {
      const data = await searchBooks({ page, limit: 12, search, genre, available });
      setBooks(data.books);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /** Loads distinct genre values for the filter chips. */
  async function fetchGenres() {
    try {
      const data = await getGenres();
      setGenres(data.genres || []);
    } catch {
      // Genres are non-critical — if this fails, the filter chips just don't appear
    }
  }

  /** Loads the member's borrowing history so we can check "already borrowed" status. */
  async function fetchMyBorrowings() {
    try {
      const data = await getMyBorrowings();
      setMyBorrowings(data.borrowings || []);
    } catch {
      // Non-critical — borrow check just defaults to "not borrowed"
    }
  }

  // ── Filter handlers ──────────────────────────────────────────────────────────

  /**
   * Called when the user types in the search bar.
   * Updates the displayed input value immediately, then debounces the API call
   * so we only fetch after the user has paused typing for 350ms.
   *
   * @param {string} query - The current value of the search input
   */
  function handleSearchChange(query) {
    setSearchQuery(query);

    // Cancel any in-progress debounce timer from the previous keystroke
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Start a new 350ms timer — if the user types again before it fires, it resets
    searchTimerRef.current = setTimeout(function () {
      fetchBooks(1, query, selectedGenre, availableOnly);
    }, 350);
  }

  /**
   * Called when the user clicks a genre chip.
   * Triggers an immediate book reload with the new genre filter.
   *
   * @param {string} genre - The genre name, or "" to show all genres
   */
  function handleGenreSelect(genre) {
    setSelectedGenre(genre);
    fetchBooks(1, searchQuery, genre, availableOnly);
  }

  /** Toggles the "Available only" filter on and off. */
  function handleAvailableToggle() {
    const newValue = !availableOnly;
    setAvailableOnly(newValue);
    fetchBooks(1, searchQuery, selectedGenre, newValue);
  }

  /**
   * Called when the user clicks Prev / Next / a page number in the pagination.
   *
   * @param {number} page - The new page number to load
   */
  function handlePageChange(page) {
    fetchBooks(page, searchQuery, selectedGenre, availableOnly);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Modal handlers ───────────────────────────────────────────────────────────

  /** Opens the book detail modal for the given book. */
  function openDetailModal(book) {
    setBorrowError("");
    setBorrowSuccess("");
    setSelectedBook(book);
  }

  /** Closes the book detail modal. */
  function closeDetailModal() {
    setSelectedBook(null);
    setBorrowError("");
    setBorrowSuccess("");
  }

  // ── Borrow / return handlers ─────────────────────────────────────────────────

  /**
   * Called when the member clicks "Borrow Book" in the detail modal.
   * On success, refreshes the books list and myBorrowings so the UI updates.
   *
   * @param {number} bookId - The ID of the book to borrow
   */
  async function handleBorrowBook(bookId) {
    setBorrowLoading(true);
    setBorrowError("");
    setBorrowSuccess("");

    try {
      const data = await borrowBook(bookId);
      setBorrowSuccess(data.message);
      // Refresh borrowings and books so availability counts are current
      await fetchMyBorrowings();
      await fetchBooks(pagination.currentPage, searchQuery, selectedGenre, availableOnly);
    } catch (err) {
      setBorrowError(err.message);
    } finally {
      setBorrowLoading(false);
    }
  }

  /**
   * Called when the member clicks "Return Book" in the detail modal.
   *
   * @param {number} borrowId - The ID of the Borrowing record to mark as returned
   */
  async function handleReturnBook(borrowId) {
    setBorrowLoading(true);
    setBorrowError("");
    setBorrowSuccess("");

    try {
      const data = await returnBook(borrowId);
      setBorrowSuccess(data.message);
      await fetchMyBorrowings();
      await fetchBooks(pagination.currentPage, searchQuery, selectedGenre, availableOnly);
    } catch (err) {
      setBorrowError(err.message);
    } finally {
      setBorrowLoading(false);
    }
  }

  /**
   * Checks if the member currently has this book borrowed (not returned).
   * Used by the BookDetailModal to decide which button to show.
   *
   * @param {number} bookId - The book's ID
   * @returns {object|null} - The active Borrowing record, or null
   */
  function getActiveBorrowing(bookId) {
    return myBorrowings.find(function (b) {
      return b.book && b.book.id === bookId && b.status === "borrowed";
    }) || null;
  }

  // ── Context value ─────────────────────────────────────────────────────────────
  const value = {
    // State
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
    myBorrowings,
    borrowLoading,
    borrowError,
    borrowSuccess,

    // Actions
    setViewMode,
    handleSearchChange,
    handleGenreSelect,
    handleAvailableToggle,
    handlePageChange,
    openDetailModal,
    closeDetailModal,
    handleBorrowBook,
    handleReturnBook,
    getActiveBorrowing,
  };

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}
