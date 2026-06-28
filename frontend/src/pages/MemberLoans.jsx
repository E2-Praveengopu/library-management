/**
 * MemberLoans Page Component
 *
 * Shows a member's complete borrowing activity in two sections:
 *
 *   SECTION 1 — ACTIVE LOANS
 *   Card grid of books the member currently has borrowed.
 *   Each card shows:
 *     - Cover image (or placeholder)
 *     - Genre chip
 *     - Title + Author
 *     - Due date with days remaining countdown
 *     - Red "OVERDUE" ribbon and red highlight if the due date has passed
 *     - "Return Book" button
 *
 *   SECTION 2 — BORROWING HISTORY
 *   Compact list rows of books the member has returned in the past.
 *   Each row shows: thumbnail, title, author, borrowed date, returned date.
 *
 * OVERDUE DETECTION:
 *   A loan is overdue when: status === "borrowed" AND dueDate < today
 *   The frontend calculates this client-side from the dueDate field.
 *
 * DATA:
 *   Fetches from GET /api/member/my-books (requires member JWT).
 *   Uses local state (no context needed — this is a self-contained page).
 *
 * RETURN ACTION:
 *   Calls PUT /api/member/return/:borrowId.
 *   On success, refreshes the full list so counts and cards update.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { getMyBorrowings, returnBook } from "../services/borrowService";
import "../styles/auth.css";
import "../styles/memberLoans.css";

/**
 * MemberLoans functional component.
 * All state is local — no context needed for this page.
 */
function MemberLoans() {

  const navigate  = useNavigate();
  const user      = getUser();

  // Full borrowings list from the API
  const [borrowings, setBorrowings]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  // Per-card return state (keyed by borrowId so only the right card shows loading)
  const [returning, setReturning]       = useState(null); // the borrowId being returned
  const [returnError, setReturnError]   = useState("");

  // ── Load on mount ────────────────────────────────────────────────────────────
  useEffect(function () {
    loadBorrowings();
  }, []);

  async function loadBorrowings() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBorrowings();
      setBorrowings(data.borrowings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  // ── Return a book ─────────────────────────────────────────────────────────────
  async function handleReturn(borrowId) {
    setReturning(borrowId);
    setReturnError("");
    try {
      await returnBook(borrowId);
      // Refresh the whole list so the card moves from Active to History
      await loadBorrowings();
    } catch (err) {
      setReturnError(err.message);
    } finally {
      setReturning(null);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /** Format a date to "15 Jun 2025" */
  function fmt(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  /** How many days until the due date (negative = overdue). */
  function daysUntilDue(dueDateStr) {
    if (!dueDateStr) return null;
    return Math.ceil((new Date(dueDateStr) - new Date()) / (1000 * 60 * 60 * 24));
  }

  /** True if the loan is currently past its due date. */
  function checkOverdue(b) {
    return b.status === "borrowed" && b.dueDate && new Date(b.dueDate) < new Date();
  }

  // ── Split into active and returned ───────────────────────────────────────────
  const activeLoans = borrowings.filter(function (b) { return b.status === "borrowed"; });
  const history     = borrowings.filter(function (b) { return b.status === "returned"; });

  const overdueCount = activeLoans.filter(checkOverdue).length;

  return (
    <div className="ml-page">

      {/* ================================================================
          STICKY NAV
          ================================================================ */}
      <nav className="ml-nav">
        <div className="ml-nav-left">
          <span className="ml-nav-logo">Library</span>
          <div className="ml-nav-divider" />
          <span className="ml-nav-title">My Borrowed Books</span>
        </div>
        <div className="ml-nav-right">
          <Link to="/member/books" className="ml-nav-link">Discover Books</Link>
          <Link to="/member/dashboard" className="ml-nav-link">Dashboard</Link>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <main className="ml-content">

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loading && (
          <div className="ml-loading">
            <div className="ml-spinner" />
            <p>Loading your books…</p>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {!loading && error && <div className="ml-error">{error}</div>}

        {/* Return action error */}
        {returnError && <div className="ml-error">{returnError}</div>}

        {/* ── Empty (no borrowing history at all) ───────────────────────── */}
        {!loading && !error && borrowings.length === 0 && (
          <div className="ml-empty">
            <span className="ml-empty-icon">📚</span>
            <h3>No Borrowed Books</h3>
            <p>You haven't borrowed any books yet. Browse our catalog to get started.</p>
            <Link to="/member/books" className="ml-empty-link">Browse Books →</Link>
          </div>
        )}

        {/* ================================================================
            SECTION 1 — ACTIVE LOANS
            ================================================================ */}
        {!loading && activeLoans.length > 0 && (
          <>
            <div className="ml-section-header">
              <h2 className="ml-section-title">Active Loans</h2>
              <span className={`ml-section-count ${overdueCount > 0 ? "count-overdue" : ""}`}>
                {activeLoans.length} book{activeLoans.length !== 1 ? "s" : ""}
                {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
              </span>
            </div>
            <div className="ml-section-divider" />

            <div className="ml-active-grid">
              {activeLoans.map(function (b) {
                const overdue = checkOverdue(b);
                const days    = daysUntilDue(b.dueDate);

                return (
                  <div
                    key={b.id}
                    className={`ml-loan-card ${overdue ? "card-overdue" : ""}`}
                  >
                    {/* Cover image */}
                    <div className="ml-loan-cover">
                      {b.book && b.book.coverImageUrl ? (
                        <img
                          src={b.book.coverImageUrl}
                          alt={b.book.title}
                          className="ml-loan-cover-img"
                        />
                      ) : (
                        <div className="ml-loan-no-cover">
                          <span className="ml-loan-no-cover-icon">📖</span>
                          <span style={{ fontSize: "11px", color: "#a0aec0" }}>No Cover</span>
                        </div>
                      )}

                      {/* OVERDUE ribbon */}
                      {overdue && (
                        <div className="ml-overdue-ribbon">OVERDUE</div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="ml-loan-body">
                      {b.book && (
                        <span className="ml-loan-genre">{b.book.genre}</span>
                      )}

                      <h3 className="ml-loan-title">
                        {b.book ? b.book.title : "Unknown Title"}
                      </h3>
                      <p className="ml-loan-author">
                        {b.book ? `by ${b.book.author}` : ""}
                      </p>

                      {/* Due date block */}
                      <div className={`ml-due-date ${overdue ? "due-overdue" : ""}`}>
                        <span className="ml-due-date-icon">
                          {overdue ? "⚠️" : "📅"}
                        </span>
                        <div>
                          <div className="ml-due-date-label">
                            {overdue ? "Was due" : "Due by"}
                          </div>
                          <div className="ml-due-date-value">{fmt(b.dueDate)}</div>
                        </div>
                        {days !== null && (
                          <span className={`ml-days-left ${overdue ? "days-overdue" : ""}`}>
                            {overdue
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                                ? "Due today!"
                                : `${days}d left`}
                          </span>
                        )}
                      </div>

                      {/* Return button */}
                      <button
                        className="ml-return-btn"
                        onClick={function () { handleReturn(b.id); }}
                        disabled={returning === b.id}
                      >
                        {returning === b.id ? "Returning…" : "Return Book"}
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================================================================
            SECTION 2 — BORROWING HISTORY
            ================================================================ */}
        {!loading && history.length > 0 && (
          <>
            <div className="ml-section-header" style={{ marginTop: "12px" }}>
              <h2 className="ml-section-title">Borrowing History</h2>
              <span className="ml-section-count">
                {history.length} book{history.length !== 1 ? "s" : ""} returned
              </span>
            </div>
            <div className="ml-section-divider" />

            <div className="ml-history-list">
              {history.map(function (b) {
                return (
                  <div key={b.id} className="ml-history-row">

                    {/* Thumbnail */}
                    <div className="ml-history-thumb">
                      {b.book && b.book.coverImageUrl ? (
                        <img
                          src={b.book.coverImageUrl}
                          alt={b.book.title}
                          className="ml-history-thumb-img"
                        />
                      ) : (
                        <div className="ml-history-thumb-placeholder">📖</div>
                      )}
                    </div>

                    {/* Book info */}
                    <div className="ml-history-info">
                      <p className="ml-history-title">
                        {b.book ? b.book.title : "Unknown Title"}
                      </p>
                      <p className="ml-history-author">
                        {b.book ? b.book.author : ""}
                      </p>
                      <div className="ml-history-dates">
                        <span className="ml-history-date-item">
                          <strong>Borrowed:</strong> {fmt(b.borrowedAt)}
                        </span>
                        <span className="ml-history-date-item">
                          <strong>Returned:</strong> {fmt(b.returnedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Returned badge */}
                    <span className="ml-history-badge">✓ Returned</span>

                  </div>
                );
              })}
            </div>
          </>
        )}

      </main>
    </div>
  );
}

export default MemberLoans;
