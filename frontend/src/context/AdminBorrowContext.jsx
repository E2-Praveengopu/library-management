/**
 * AdminBorrowContext.jsx
 *
 * Shared state for the Admin Borrowings Management page.
 *
 * WHAT THIS CONTEXT MANAGES:
 *   borrowings   → paginated list of all library borrowing records
 *   pagination   → page info (current page, total pages, etc.)
 *   stats        → { overdueCount } — shown in the summary cards
 *   loading      → true while the borrowings list is fetching
 *   error        → error message if a fetch fails
 *
 *   statusFilter → "all" | "borrowed" | "returned" | "overdue"
 *   searchQuery  → text that searches member name/email or book title
 *   currentPage  → the page we are currently viewing
 *
 *   members      → list of all members (for the Issue Book dropdown)
 *   availBooks   → list of books with copies available (for Issue Book dropdown)
 *
 *   showIssueModal → controls whether the Issue Book modal is visible
 *   issueLoading   → true while the issue-book API call is in progress
 *   issueError     → error from the issue-book call
 *   issueSuccess   → success message from the issue-book call
 *
 *   actionLoading  → borrowId currently being marked as returned (or null)
 *   actionError    → error from a mark-returned action
 *
 * LIVE SEARCH:
 *   Uses a 350 ms debounce via useRef so the API is not called for every keystroke.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  getAllBorrowings,
  issueBorrow,
  adminMarkReturned,
  getMembers,
  getAvailableBooks,
} from "../services/adminBorrowService";

const AdminBorrowContext = createContext(null);

/**
 * Custom hook — call inside any child of <AdminBorrowProvider>.
 * Usage: const { borrowings, handleIssue } = useAdminBorrow();
 */
export function useAdminBorrow() {
  const ctx = useContext(AdminBorrowContext);
  if (!ctx) throw new Error("useAdminBorrow must be used inside <AdminBorrowProvider>");
  return ctx;
}

/**
 * AdminBorrowProvider
 *
 * Wraps the /admin/borrowings route in App.jsx.
 * Exposes all state and action functions to child components.
 */
export function AdminBorrowProvider({ children }) {

  // ── Borrowings list ────────────────────────────────────────────────────────
  const [borrowings, setBorrowings]   = useState([]);
  const [pagination, setPagination]   = useState({
    currentPage: 1, totalPages: 1, totalBorrowings: 0,
    hasNextPage: false, hasPreviousPage: false,
  });
  const [stats, setStats]             = useState({ overdueCount: 0 });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // ── Filters ────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [currentPage, setCurrentPage]   = useState(1);

  // ── Issue modal data ───────────────────────────────────────────────────────
  const [members, setMembers]         = useState([]);
  const [availBooks, setAvailBooks]   = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueLoading, setIssueLoading]     = useState(false);
  const [issueError, setIssueError]         = useState("");
  const [issueSuccess, setIssueSuccess]     = useState("");

  // ── Per-row action state ───────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(null); // borrowId being processed
  const [actionError, setActionError]     = useState("");

  // Debounce timer ref
  const searchTimer = useRef(null);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(function () {
    fetchBorrowings(1, "all", "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ──────────────────────────────────────────────────────────

  /**
   * Fetches borrowing records with the given filters.
   * All params are passed explicitly to avoid stale closures.
   *
   * @param {number} page
   * @param {string} status  - "all" | "borrowed" | "returned" | "overdue"
   * @param {string} search
   */
  async function fetchBorrowings(page, status, search) {
    setLoading(true);
    setError("");
    try {
      const data = await getAllBorrowings({ page, limit: 15, status, search });
      setBorrowings(data.borrowings);
      setPagination(data.pagination);
      setStats(data.stats || { overdueCount: 0 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /** Loads members and available books for the Issue Book modal dropdowns. */
  async function fetchModalData() {
    try {
      const [membersData, booksData] = await Promise.all([
        getMembers(),
        getAvailableBooks(),
      ]);
      setMembers(membersData.members || []);
      setAvailBooks(booksData.books || []);
    } catch (err) {
      setIssueError("Failed to load dropdown data: " + err.message);
    }
  }

  // ── Filter handlers ────────────────────────────────────────────────────────

  /**
   * Called when the admin types in the search bar.
   * The display value updates instantly; the API call is debounced 350ms.
   *
   * @param {string} query
   */
  function handleSearchChange(query) {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(function () {
      fetchBorrowings(1, statusFilter, query);
    }, 350);
  }

  /**
   * Called when the admin clicks a status tab (All / Active / Overdue / Returned).
   *
   * @param {string} status
   */
  function handleStatusChange(status) {
    setStatusFilter(status);
    fetchBorrowings(1, status, searchQuery);
  }

  /** Pagination button click. */
  function handlePageChange(page) {
    fetchBorrowings(page, statusFilter, searchQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Issue Book ─────────────────────────────────────────────────────────────

  /** Opens the Issue Book modal and loads dropdown data. */
  function openIssueModal() {
    setIssueError("");
    setIssueSuccess("");
    setShowIssueModal(true);
    fetchModalData();
  }

  /** Closes the Issue Book modal. */
  function closeIssueModal() {
    setShowIssueModal(false);
    setIssueError("");
    setIssueSuccess("");
  }

  /**
   * Submits the Issue Book form.
   *
   * @param {{ userId, bookId, dueDate? }}
   */
  async function handleIssue({ userId, bookId, dueDate }) {
    setIssueLoading(true);
    setIssueError("");
    setIssueSuccess("");
    try {
      const data = await issueBorrow({ userId, bookId, dueDate });
      setIssueSuccess(data.message);
      // Refresh the main list so the new record appears
      await fetchBorrowings(1, statusFilter, searchQuery);
      // Refresh available books — one copy was just issued
      const booksData = await getAvailableBooks();
      setAvailBooks(booksData.books || []);
    } catch (err) {
      setIssueError(err.message);
    } finally {
      setIssueLoading(false);
    }
  }

  // ── Mark as Returned ───────────────────────────────────────────────────────

  /**
   * Admin marks a specific borrowing as returned.
   *
   * @param {number} borrowId
   */
  async function handleMarkReturned(borrowId) {
    setActionLoading(borrowId);
    setActionError("");
    try {
      await adminMarkReturned(borrowId);
      // Refresh the list so the row updates to "returned" status
      await fetchBorrowings(currentPage, statusFilter, searchQuery);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    borrowings, pagination, stats, loading, error,
    statusFilter, searchQuery, currentPage,
    members, availBooks,
    showIssueModal, issueLoading, issueError, issueSuccess,
    actionLoading, actionError,

    handleSearchChange,
    handleStatusChange,
    handlePageChange,
    openIssueModal,
    closeIssueModal,
    handleIssue,
    handleMarkReturned,
  };

  return (
    <AdminBorrowContext.Provider value={value}>
      {children}
    </AdminBorrowContext.Provider>
  );
}
