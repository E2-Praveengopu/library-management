/**
 * AdminBorrowings Page Component
 *
 * The admin's complete view of all library borrowing activity.
 *
 * WHAT THIS PAGE OFFERS:
 *   - Summary stats: Total Active | Total Returned | Overdue count
 *   - "Issue Book" button → opens a modal to assign any book to any member
 *   - Live search bar (searches member name/email or book title)
 *   - Status filter tabs: All | Active | Overdue | Returned
 *   - Paginated table of all borrowing records
 *   - Each row shows: Member, Book, Status, Borrowed Date, Due Date, Action
 *   - Overdue rows are highlighted red with an "OVERDUE" tag
 *   - Per-row "Return" button to mark a book as returned
 *
 * TABLE COLUMNS:
 *   Member      → name + email
 *   Book        → title + author
 *   Status      → badge: Active / Returned / Overdue
 *   Borrowed On → date issued
 *   Due Date    → due date + OVERDUE flag if past due
 *   Returned On → date returned (or —)
 *   Action      → "Return" button (active only)
 *
 * CONTEXT:
 *   Wrapped in <AdminBorrowProvider> in App.jsx.
 *   All data and actions come from useAdminBorrow().
 *
 * ACCESS CONTROL:
 *   Protected by ProtectedRoute with requiredRole="admin".
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { useAdminBorrow } from "../context/AdminBorrowContext";
import "../styles/auth.css";
import "../styles/adminBorrowings.css";

/**
 * AdminBorrowings functional component.
 * Composes the stats, toolbar, filter tabs, table, modals, and pagination.
 */
function AdminBorrowings() {

  const navigate = useNavigate();
  const adminUser = getUser();

  const {
    borrowings, pagination, stats,
    loading, error,
    statusFilter, searchQuery, currentPage,
    showIssueModal,
    actionLoading, actionError,

    handleSearchChange,
    handleStatusChange,
    handlePageChange,
    openIssueModal,
    handleMarkReturned,
  } = useAdminBorrow();

  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  /** Formats a date string to a readable short date. Example: "15 Jun 2025" */
  function fmt(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  /** Returns days remaining until due date (negative = overdue). */
  function daysLeft(dueDateStr) {
    if (!dueDateStr) return null;
    const diff = Math.ceil((new Date(dueDateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  // Pagination page numbers (window of 5 around current page)
  function getPageNums() {
    const MAX   = 5;
    const total = pagination.totalPages || 1;
    const cur   = pagination.currentPage || 1;
    if (total <= MAX) return Array.from({ length: total }, function (_, i) { return i + 1; });
    let start = Math.max(1, cur - 2);
    let end   = Math.min(total, start + MAX - 1);
    start     = Math.max(1, end - MAX + 1);
    return Array.from({ length: end - start + 1 }, function (_, i) { return start + i; });
  }

  const pageNums = getPageNums();

  // Count stats from current data
  const totalActive   = borrowings.filter(function (b) { return b.status === "borrowed" && !b.isOverdue; }).length;
  const totalReturned = borrowings.filter(function (b) { return b.status === "returned"; }).length;

  return (
    <div className="ab-page">

      {/* ================================================================
          STICKY NAV
          ================================================================ */}
      <nav className="ab-nav">
        <div className="ab-nav-left">
          <span className="ab-nav-logo">Library</span>
          <div className="ab-nav-divider" />
          <span className="ab-nav-title">Borrow Management</span>
        </div>
        <div className="ab-nav-right">
          <Link to="/admin/books" className="ab-nav-link">Book Catalog</Link>
          <Link to="/admin/dashboard" className="ab-nav-link">Dashboard</Link>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <main className="ab-content">

        {/* Page title + Issue button */}
        <div className="ab-page-header">
          <div>
            <h1 className="ab-page-title">Borrow & Return Management</h1>
            <p className="ab-page-subtitle">
              Track every book loan, issue new books to members, and process returns.
            </p>
          </div>
          <button className="ab-issue-btn" onClick={openIssueModal}>
            + Issue Book
          </button>
        </div>

        {/* ── Summary Stats ─────────────────────────────────────────────── */}
        <div className="ab-stats">

          <div className="ab-stat-card stat-active">
            <span className="ab-stat-label">Active Loans</span>
            <span className="ab-stat-value">{pagination.totalBorrowings || 0}</span>
          </div>

          <div className="ab-stat-card stat-overdue">
            <span className="ab-stat-label">Overdue</span>
            <span className="ab-stat-value">{stats.overdueCount}</span>
          </div>

          <div className="ab-stat-card stat-returned">
            <span className="ab-stat-label">Returned (page)</span>
            <span className="ab-stat-value">{totalReturned}</span>
          </div>

        </div>

        {/* ── Toolbar: Search ───────────────────────────────────────────── */}
        <div className="ab-toolbar">
          <div className="ab-search-wrap">
            <span className="ab-search-icon">🔍</span>
            <input
              type="text"
              className="ab-search-input"
              placeholder="Search member name, email or book title…"
              value={searchQuery}
              onChange={function (e) { handleSearchChange(e.target.value); }}
            />
          </div>
        </div>

        {/* ── Status Filter Tabs ────────────────────────────────────────── */}
        <div className="ab-tabs">
          {[
            { key: "all",      label: "All" },
            { key: "borrowed", label: "Active" },
            { key: "overdue",  label: "⚠ Overdue", extraClass: "tab-overdue" },
            { key: "returned", label: "Returned" },
          ].map(function (tab) {
            return (
              <button
                key={tab.key}
                className={`ab-tab ${tab.extraClass || ""} ${statusFilter === tab.key ? "active" : ""}`}
                onClick={function () { handleStatusChange(tab.key); }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action error (e.g. failed to mark returned) */}
        {actionError && <div className="ab-action-error">{actionError}</div>}
        {error       && <div className="ab-action-error">{error}</div>}

        {/* ── Loading State ──────────────────────────────────────────────── */}
        {loading && (
          <div className="ab-loading">
            <div className="ab-spinner" />
            <p>Loading borrowings…</p>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!loading && borrowings.length === 0 && (
          <div className="ab-empty">
            <span className="ab-empty-icon">📋</span>
            <h3>No Borrowings Found</h3>
            <p>
              {searchQuery
                ? `No records match "${searchQuery}".`
                : statusFilter === "overdue"
                  ? "No overdue loans — great news!"
                  : statusFilter === "borrowed"
                    ? "No active loans at the moment."
                    : "No borrowing records yet. Issue a book to get started."}
            </p>
          </div>
        )}

        {/* ── Borrowings Table ───────────────────────────────────────────── */}
        {!loading && borrowings.length > 0 && (
          <div className="ab-table-wrap">
            <table className="ab-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Book</th>
                  <th>Status</th>
                  <th>Borrowed On</th>
                  <th>Due Date</th>
                  <th className="ab-col-returned">Returned On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {borrowings.map(function (b) {
                  const days = daysLeft(b.dueDate);
                  return (
                    <tr
                      key={b.id}
                      className={b.isOverdue ? "ab-row-overdue" : ""}
                    >
                      {/* Member */}
                      <td>
                        <div className="ab-member-name">
                          {b.member ? b.member.name : "—"}
                        </div>
                        <div className="ab-member-email">
                          {b.member ? b.member.email : ""}
                        </div>
                      </td>

                      {/* Book */}
                      <td>
                        <div className="ab-book-title">
                          {b.book ? b.book.title : "—"}
                        </div>
                        <div className="ab-book-author">
                          {b.book ? b.book.author : ""}
                        </div>
                      </td>

                      {/* Status badge */}
                      <td>
                        {b.isOverdue ? (
                          <span className="ab-badge ab-badge-overdue">⚠ Overdue</span>
                        ) : b.status === "returned" ? (
                          <span className="ab-badge ab-badge-returned">✓ Returned</span>
                        ) : (
                          <span className="ab-badge ab-badge-borrowed">● Active</span>
                        )}
                      </td>

                      {/* Borrowed On */}
                      <td>{fmt(b.borrowedAt)}</td>

                      {/* Due Date + overdue indicator */}
                      <td>
                        {b.dueDate ? (
                          <>
                            {fmt(b.dueDate)}
                            {b.isOverdue && (
                              <span className="ab-overdue-flag">
                                {Math.abs(days)}d overdue
                              </span>
                            )}
                          </>
                        ) : "—"}
                      </td>

                      {/* Returned On */}
                      <td className="ab-col-returned">{fmt(b.returnedAt)}</td>

                      {/* Action */}
                      <td>
                        {b.status === "borrowed" ? (
                          <button
                            className="ab-return-btn"
                            onClick={function () { handleMarkReturned(b.id); }}
                            disabled={actionLoading === b.id}
                          >
                            {actionLoading === b.id ? "Returning…" : "Return"}
                          </button>
                        ) : (
                          <span className="ab-returned-label">Returned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {!loading && pagination.totalPages > 1 && (
          <div className="ab-pagination">
            <button
              className="ab-pagination-btn"
              onClick={function () { handlePageChange(currentPage - 1); }}
              disabled={!pagination.hasPreviousPage}
            >
              ← Prev
            </button>

            {pageNums[0] > 1 && (
              <>
                <button className="ab-pagination-page" onClick={function () { handlePageChange(1); }}>1</button>
                {pageNums[0] > 2 && <span className="ab-pagination-dots">…</span>}
              </>
            )}

            {pageNums.map(function (n) {
              return (
                <button
                  key={n}
                  className={`ab-pagination-page ${n === currentPage ? "active" : ""}`}
                  onClick={function () { handlePageChange(n); }}
                >
                  {n}
                </button>
              );
            })}

            {pageNums[pageNums.length - 1] < pagination.totalPages && (
              <>
                {pageNums[pageNums.length - 1] < pagination.totalPages - 1 && (
                  <span className="ab-pagination-dots">…</span>
                )}
                <button
                  className="ab-pagination-page"
                  onClick={function () { handlePageChange(pagination.totalPages); }}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            <button
              className="ab-pagination-btn"
              onClick={function () { handlePageChange(currentPage + 1); }}
              disabled={!pagination.hasNextPage}
            >
              Next →
            </button>
          </div>
        )}

      </main>

      {/* ── Issue Book Modal ───────────────────────────────────────────── */}
      {showIssueModal && <IssueBorrowModal />}

    </div>
  );
}


/**
 * IssueBorrowModal
 *
 * A form modal that lets an admin:
 *   1. Select a member from a dropdown
 *   2. Select a book (only books with available copies are shown)
 *   3. Optionally set a custom due date (defaults to today + 14 days)
 *
 * All data and handlers come from AdminBorrowContext via useAdminBorrow().
 * Defined here (same file) because it's only ever used by AdminBorrowings.
 */
function IssueBorrowModal() {

  const {
    members, availBooks,
    issueLoading, issueError, issueSuccess,
    closeIssueModal, handleIssue,
  } = useAdminBorrow();

  // Local form state
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedBook,   setSelectedBook]   = useState("");
  const [dueDate,        setDueDate]         = useState("");

  // Default due date = today + 14 days (ISO date string for the input[type=date])
  const defaultDue = (function () {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  })();

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedMember || !selectedBook) return;
    handleIssue({
      userId:  parseInt(selectedMember),
      bookId:  parseInt(selectedBook),
      dueDate: dueDate || defaultDue,
    });
  }

  return (
    <div
      className="ab-modal-overlay"
      onClick={function (e) { if (e.target === e.currentTarget) closeIssueModal(); }}
    >
      <div className="ab-modal-card">

        {/* Modal header */}
        <div className="ab-modal-header">
          <h2 className="ab-modal-title">Issue Book to Member</h2>
          <button className="ab-modal-close" onClick={closeIssueModal} aria-label="Close">×</button>
        </div>

        {/* Modal body — the form */}
        <form onSubmit={handleSubmit}>
          <div className="ab-modal-body">

            {/* Member select */}
            <div className="ab-form-group">
              <label className="ab-form-label">
                Select Member <span className="ab-form-required">*</span>
              </label>
              <select
                className="ab-form-select"
                value={selectedMember}
                onChange={function (e) { setSelectedMember(e.target.value); }}
                required
              >
                <option value="">— Choose a member —</option>
                {members.map(function (m) {
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Book select */}
            <div className="ab-form-group">
              <label className="ab-form-label">
                Select Book <span className="ab-form-required">*</span>
              </label>
              <select
                className="ab-form-select"
                value={selectedBook}
                onChange={function (e) { setSelectedBook(e.target.value); }}
                required
              >
                <option value="">— Choose a book —</option>
                {availBooks.map(function (b) {
                  return (
                    <option key={b.id} value={b.id}>
                      {b.title} — {b.author} ({b.availableCopies} available)
                    </option>
                  );
                })}
              </select>
              {availBooks.length === 0 && (
                <p className="ab-form-hint">No books currently available to issue.</p>
              )}
            </div>

            {/* Due date */}
            <div className="ab-form-group">
              <label className="ab-form-label">Due Date</label>
              <input
                type="date"
                className="ab-form-input"
                value={dueDate || defaultDue}
                min={new Date().toISOString().split("T")[0]}
                onChange={function (e) { setDueDate(e.target.value); }}
              />
              <p className="ab-form-hint">Leave as-is to use the default (14 days from today).</p>
            </div>

            {/* Feedback banners */}
            {issueError   && <div className="ab-modal-error">{issueError}</div>}
            {issueSuccess && <div className="ab-modal-success">{issueSuccess}</div>}

          </div>

          {/* Modal footer */}
          <div className="ab-modal-footer">
            <button type="button" className="ab-modal-cancel" onClick={closeIssueModal}>
              Cancel
            </button>
            <button
              type="submit"
              className="ab-modal-submit"
              disabled={issueLoading || !selectedMember || !selectedBook || availBooks.length === 0}
            >
              {issueLoading ? "Issuing…" : "Issue Book"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}


export default AdminBorrowings;
