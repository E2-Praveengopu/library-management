/**
 * BookContext.jsx
 *
 * This file creates a "shared storage box" for all book-related data
 * using React's Context API.
 *
 * WHY DO WE NEED CONTEXT?
 *   Without context, you have to pass data from parent → child → grandchild
 *   via props (called "prop drilling"). It becomes messy when many components
 *   need the same data (books list, loading state, modals, etc.).
 *
 *   Context lets ANY component in the tree read and update shared data
 *   directly — no prop drilling needed.
 *
 * HOW IT WORKS:
 *   1. BookProvider wraps the catalog page (in App.jsx)
 *   2. It holds all the state: books, pagination, loading, modals, etc.
 *   3. Any child component calls useBookContext() to access that state
 *   4. When state updates, all components that use it re-render automatically
 *
 * WHAT'S INSIDE:
 *   State  → books, pagination, loading, error, view mode, modal visibility
 *   Actions → load books, add, update, delete, open/close modals
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { getBooks, addBook, updateBook, deleteBook } from "../services/bookService";

// =============================================================================
// 1. CREATE THE CONTEXT
// Think of this as creating an empty "box". We'll fill it with data inside
// BookProvider below. Components call useBookContext() to reach into this box.
// =============================================================================
const BookContext = createContext(null);

// =============================================================================
// 2. CUSTOM HOOK: useBookContext
// A convenience function so components don't have to import useContext AND
// BookContext separately. They just call useBookContext() and get everything.
// =============================================================================

/**
 * Custom hook that gives any component access to the book context.
 *
 * Usage in any component:
 *   const { books, loading, openAddForm } = useBookContext();
 *
 * @returns {object} - All state and actions from the BookProvider
 * @throws {Error} - If called outside of a BookProvider wrapper
 */
export function useBookContext() {
  const context = useContext(BookContext);

  // Safety check: if someone forgets to wrap the component tree with BookProvider
  if (!context) {
    throw new Error("useBookContext must be used inside a <BookProvider>.");
  }

  return context;
}

// =============================================================================
// 3. BOOK PROVIDER COMPONENT
// This component "provides" the context value to all its children.
// Wrap the catalog page with this in App.jsx to enable context access.
// =============================================================================

/**
 * BookProvider Component
 *
 * Wraps the catalog section of the app and makes book data available
 * to every component inside it without prop drilling.
 *
 * Props:
 *   children - The React components nested inside this provider
 */
export function BookProvider({ children }) {

  // ---------------------------------------------------------------------------
  // STATE DECLARATIONS
  // Each piece of state is like a variable that triggers a re-render when changed.
  // ---------------------------------------------------------------------------

  /** The list of book objects for the current page */
  const [books, setBooks] = useState([]);

  /**
   * Pagination info from the backend:
   * {
   *   currentPage: 1,
   *   totalPages: 5,
   *   totalBooks: 47,
   *   booksPerPage: 10,
   *   hasNextPage: true,
   *   hasPreviousPage: false
   * }
   */
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBooks: 0,
    booksPerPage: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  /** True while waiting for the server to respond (shows a spinner) */
  const [loading, setLoading] = useState(false);

  /** Holds an error message string if a request fails, otherwise empty */
  const [error, setError] = useState("");

  /** Which page the user is currently viewing (1-based) */
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Whether books are shown in a grid (cards) or a list (rows).
   * "grid" shows a responsive multi-column card layout.
   * "list" shows a compact single-column row layout.
   */
  const [viewMode, setViewMode] = useState("grid");

  // --- Modal state -----------------------------------------------------------

  /** True when the Add / Edit book form modal is visible */
  const [showForm, setShowForm] = useState(false);

  /**
   * The book being edited, or null when adding a new book.
   * BookForm uses this to decide whether to pre-fill its fields.
   */
  const [selectedBook, setSelectedBook] = useState(null);

  /** True when the delete confirmation modal is visible */
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /** The book the user wants to delete (shown in the confirmation dialog) */
  const [bookToDelete, setBookToDelete] = useState(null);

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Loads a page of books from the backend and updates state.
   *
   * @param {number} page - Which page to load (default: 1)
   */
  async function loadBooks(page = 1) {
    setLoading(true);  // show spinner
    setError("");      // clear any old error message

    try {
      const data = await getBooks(page, 10);

      setBooks(data.books);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      // If something went wrong, show the error message to the user
      setError(err.message);
    } finally {
      // Always turn off the spinner, whether the request succeeded or failed
      setLoading(false);
    }
  }

  /**
   * useEffect runs loadBooks once when the provider first mounts.
   * The empty [] means "run only once, not on every re-render".
   */
  useEffect(function () {
    loadBooks(1);
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD ACTIONS (Create, Read, Update, Delete)
  // ---------------------------------------------------------------------------

  /**
   * Submits a new book to the backend, then refreshes the book list.
   *
   * @param {FormData} formData - Book fields + optional cover image file
   * @returns {object} - The newly created book from the backend
   * @throws {Error} - If the server returns an error (e.g. duplicate ISBN)
   */
  async function handleAddBook(formData) {
    const data = await addBook(formData);
    // Reload the current page so the new book appears
    await loadBooks(currentPage);
    return data;
  }

  /**
   * Sends updated book data to the backend, then refreshes the book list.
   *
   * @param {number}   id       - The book's database ID
   * @param {FormData} formData - Updated field values
   * @returns {object} - The updated book from the backend
   * @throws {Error} - If the server returns an error
   */
  async function handleUpdateBook(id, formData) {
    const data = await updateBook(id, formData);
    await loadBooks(currentPage);
    return data;
  }

  /**
   * Deletes a book permanently, then refreshes the book list.
   *
   * Edge case: if the deleted book was the only one on this page
   * (e.g. page 3 had 1 book), we go back to the previous page.
   *
   * @param {number} id - The book's database ID
   * @throws {Error} - If the server returns an error
   */
  async function handleDeleteBook(id) {
    await deleteBook(id);

    // If this was the last book on a non-first page, go back one page
    const newPage = books.length === 1 && currentPage > 1
      ? currentPage - 1
      : currentPage;

    await loadBooks(newPage);
  }

  // ---------------------------------------------------------------------------
  // MODAL HELPERS
  // Functions that open and close the Add/Edit form and the Delete modal
  // ---------------------------------------------------------------------------

  /** Opens the form in "Add" mode (blank fields) */
  function openAddForm() {
    setSelectedBook(null); // null tells BookForm to start with empty fields
    setShowForm(true);
  }

  /**
   * Opens the form in "Edit" mode (fields pre-filled with the book's data).
   * @param {object} book - The book object to edit
   */
  function openEditForm(book) {
    setSelectedBook(book);
    setShowForm(true);
  }

  /** Closes the Add/Edit form without saving */
  function closeForm() {
    setShowForm(false);
    setSelectedBook(null);
  }

  /**
   * Opens the delete confirmation dialog.
   * @param {object} book - The book the user wants to delete
   */
  function openDeleteModal(book) {
    setBookToDelete(book);
    setShowDeleteModal(true);
  }

  /** Closes the delete confirmation dialog without deleting */
  function closeDeleteModal() {
    setShowDeleteModal(false);
    setBookToDelete(null);
  }

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // This object is what every component sees when they call useBookContext().
  // ---------------------------------------------------------------------------
  const contextValue = {
    // State
    books,
    pagination,
    loading,
    error,
    currentPage,
    viewMode,
    showForm,
    selectedBook,
    showDeleteModal,
    bookToDelete,

    // Actions
    loadBooks,
    setViewMode,
    handleAddBook,
    handleUpdateBook,
    handleDeleteBook,
    openAddForm,
    openEditForm,
    closeForm,
    openDeleteModal,
    closeDeleteModal,
  };

  return (
    <BookContext.Provider value={contextValue}>
      {children}
    </BookContext.Provider>
  );
}
