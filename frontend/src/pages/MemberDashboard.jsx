/**
 * MemberDashboard Page Component
 *
 * The first page a member sees after logging in.
 *
 * WHAT THIS PAGE SHOWS:
 *
 *   1. WELCOME HERO BANNER
 *      A greeting with the member's name and a short message.
 *
 *   2. STAT CARDS (4 numbers)
 *        - Total Borrowed  → all books ever borrowed (active + returned)
 *        - Currently Reading → books the member has right now
 *        - Returned         → books the member has already given back
 *        - Overdue          → books past their due date (alerts the member)
 *
 *   3. CURRENTLY BORROWED BOOKS
 *      Horizontal-scrolling cards — one card per book currently held.
 *      Each card shows:
 *        - Cover image (or placeholder icon)
 *        - Genre chip
 *        - Title and author
 *        - Due date with days remaining countdown
 *        - Red "OVERDUE" ribbon if the due date has passed
 *
 *   4. RECENT BORROWING HISTORY
 *      A compact list of the last 5 returned books.
 *      Shows: thumbnail, title, author, and return date.
 *
 *   5. QUICK ACTION LINKS (bottom)
 *      Two cards: "Discover Books" and "View All My Loans"
 *
 * HOW DATA IS LOADED:
 *   - One API call to GET /api/member/dashboard on mount
 *   - getMemberDashboard() from memberDashboardService.js sends the JWT token
 *   - While loading: spinner is shown
 *   - On error: error message is shown
 *
 * ACCESS:
 *   Protected by ProtectedRoute in App.jsx — only users with role "member" can see this.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { getMemberDashboard } from "../services/memberDashboardService";
import "../styles/auth.css";
import "../styles/memberDashboard.css";


// ── Helper functions ─────────────────────────────────────────────────────────

/**
 * Formats a date string to "15 Jun 2025".
 *
 * @param {string} dateStr
 * @returns {string}
 */
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/**
 * Returns how many days remain until the due date.
 * A negative number means the book is overdue.
 *
 * @param {string} dueDateStr
 * @returns {number|null}
 */
function daysLeft(dueDateStr) {
  if (!dueDateStr) return null;
  const diff = new Date(dueDateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // convert ms to days
}

/**
 * Returns a time-based greeting (Good morning / Good afternoon / Good evening).
 *
 * @returns {string}
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MemberDashboard() {

  const navigate = useNavigate();
  const user     = getUser(); // the logged-in member's info from localStorage

  // ── State ──────────────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  // ── Load data on mount ─────────────────────────────────────────────────────
  useEffect(function () {
    async function loadDashboard() {
      try {
        const data = await getMemberDashboard();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []); // [] means "run once when the component loads"

  // ── Logout ─────────────────────────────────────────────────────────────────
  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  // ── Extract data safely (fallbacks while loading or on error) ─────────────
  const stats         = dashboardData?.stats         || { totalBorrowed: 0, activeBorrows: 0, returned: 0, overdue: 0 };
  const activeLoans   = dashboardData?.activeLoans   || [];
  const recentHistory = dashboardData?.recentHistory || [];

  return (
    <div className="mdash-page">

      {/* ==================================================================
          STICKY NAVIGATION BAR
          ================================================================== */}
      <nav className="mdash-nav">
        <div className="mdash-nav-left">
          <span className="mdash-nav-logo">Library</span>
          <div className="mdash-nav-divider" />
          <span className="mdash-nav-title">My Dashboard</span>
        </div>
        <div className="mdash-nav-right">
          <Link to="/member/books" className="mdash-nav-link">Discover Books</Link>
          <Link to="/member/loans" className="mdash-nav-link">My Loans</Link>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ==================================================================
          MAIN CONTENT
          ================================================================== */}
      <main className="mdash-content">

        {/* ── Welcome Hero Banner ─────────────────────────────────────── */}
        <div className="mdash-hero">
          <div className="mdash-hero-text">
            <p className="mdash-hero-greeting">{getGreeting()}</p>
            <h1 className="mdash-hero-name">{user ? user.name : "Member"}</h1>
            <p className="mdash-hero-sub">
              {stats.activeBorrows > 0
                ? `You have ${stats.activeBorrows} book${stats.activeBorrows !== 1 ? "s" : ""} checked out.`
                : "You have no books checked out right now."}
              {stats.overdue > 0 && ` ${stats.overdue} overdue.`}
            </p>
          </div>
          <span className="mdash-hero-icon">📚</span>
        </div>

        {/* ── Loading Spinner ──────────────────────────────────────────── */}
        {loading && (
          <div className="mdash-loading">
            <div className="mdash-spinner" />
            <p>Loading your dashboard…</p>
          </div>
        )}

        {/* ── Error Message ────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="mdash-error">
            Could not load dashboard: {error}
          </div>
        )}

        {/* ── Dashboard Content ──────────────────────────────────────────── */}
        {!loading && !error && dashboardData && (
          <>

            {/* ============================================================
                SECTION 1 — STAT CARDS
                ============================================================ */}
            <div className="mdash-stats">

              <div className="mdash-stat">
                <span className="mdash-stat-icon">📋</span>
                <span className="mdash-stat-value">{stats.totalBorrowed}</span>
                <span className="mdash-stat-label">Total Borrowed</span>
              </div>

              <div className="mdash-stat stat-active">
                <span className="mdash-stat-icon">📖</span>
                <span className="mdash-stat-value">{stats.activeBorrows}</span>
                <span className="mdash-stat-label">Reading Now</span>
              </div>

              <div className="mdash-stat">
                <span className="mdash-stat-icon">✅</span>
                <span className="mdash-stat-value">{stats.returned}</span>
                <span className="mdash-stat-label">Returned</span>
              </div>

              <div className="mdash-stat stat-overdue">
                <span className="mdash-stat-icon">⚠️</span>
                <span className="mdash-stat-value">{stats.overdue}</span>
                <span className="mdash-stat-label">Overdue</span>
              </div>

            </div>


            {/* ============================================================
                SECTION 2 — CURRENTLY BORROWED BOOKS
                ============================================================ */}
            <div className="mdash-section">

              <div className="mdash-section-head">
                <h2 className="mdash-section-title">Currently Borrowed</h2>
                {activeLoans.length > 0 && (
                  <Link to="/member/loans" className="mdash-section-link">
                    View all & return →
                  </Link>
                )}
              </div>

              {/* Empty state — no books checked out */}
              {activeLoans.length === 0 && (
                <div className="mdash-empty">
                  <span className="mdash-empty-icon">📚</span>
                  <h3>No Books Checked Out</h3>
                  <p>Browse our catalog to find something you would like to read.</p>
                  <Link to="/member/books" className="mdash-empty-link">
                    Discover Books →
                  </Link>
                </div>
              )}

              {/* Horizontal scroll row of book cards */}
              {activeLoans.length > 0 && (
                <div className="mdash-loans-scroll">
                  {activeLoans.map(function (loan) {

                    const overdue = loan.isOverdue;
                    const days    = daysLeft(loan.dueDate);

                    return (
                      <div
                        key={loan.id}
                        className={`mdash-loan-card ${overdue ? "card-overdue" : ""}`}
                      >
                        {/* Cover image or placeholder */}
                        <div className="mdash-loan-cover">
                          {loan.book.coverImageUrl ? (
                            <img src={loan.book.coverImageUrl} alt={loan.book.title} />
                          ) : (
                            <div className="mdash-loan-cover-placeholder">
                              <span>📖</span>
                            </div>
                          )}

                          {/* OVERDUE ribbon — only shown if the loan is overdue */}
                          {overdue && (
                            <div className="mdash-overdue-ribbon">OVERDUE</div>
                          )}
                        </div>

                        {/* Card text body */}
                        <div className="mdash-loan-body">

                          {loan.book.genre && (
                            <span className="mdash-loan-genre">{loan.book.genre}</span>
                          )}

                          <h3 className="mdash-loan-title" title={loan.book.title}>
                            {loan.book.title}
                          </h3>
                          <p className="mdash-loan-author">
                            {loan.book.author}
                          </p>

                          {/* Due date block */}
                          <div className={`mdash-due ${overdue ? "due-overdue" : ""}`}>
                            <span className="mdash-due-icon">
                              {overdue ? "⚠️" : "📅"}
                            </span>
                            <div className="mdash-due-info">
                              <span className="mdash-due-label">
                                {overdue ? "Was due" : "Due by"}
                              </span>
                              <span className="mdash-due-date">{fmt(loan.dueDate)}</span>
                            </div>
                            {days !== null && (
                              <span className="mdash-due-days">
                                {overdue
                                  ? `${Math.abs(days)}d overdue`
                                  : days === 0
                                    ? "Today!"
                                    : `${days}d left`}
                              </span>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            {/* ============================================================
                SECTION 3 — RECENT BORROWING HISTORY
                ============================================================ */}
            <div className="mdash-section">

              <div className="mdash-section-head">
                <h2 className="mdash-section-title">Recent History</h2>
                {recentHistory.length > 0 && (
                  <Link to="/member/loans" className="mdash-section-link">
                    View full history →
                  </Link>
                )}
              </div>

              {/* Empty state — never borrowed anything */}
              {recentHistory.length === 0 && (
                <div className="mdash-empty">
                  <span className="mdash-empty-icon">📋</span>
                  <h3>No History Yet</h3>
                  <p>Books you return will appear here.</p>
                </div>
              )}

              {/* Compact list of returned books */}
              {recentHistory.length > 0 && (
                <div className="mdash-history-list">
                  {recentHistory.map(function (h) {
                    return (
                      <div key={h.id} className="mdash-history-row">

                        {/* Small book cover thumbnail */}
                        <div className="mdash-history-thumb">
                          {h.book.coverImageUrl ? (
                            <img src={h.book.coverImageUrl} alt={h.book.title} />
                          ) : (
                            "📖"
                          )}
                        </div>

                        {/* Title and author */}
                        <div className="mdash-history-info">
                          <p className="mdash-history-title" title={h.book.title}>
                            {h.book.title}
                          </p>
                          <p className="mdash-history-author">{h.book.author}</p>
                        </div>

                        {/* Return date + badge */}
                        <div className="mdash-history-right">
                          <span className="mdash-history-returned">
                            Returned {fmt(h.returnedAt)}
                          </span>
                          <span className="mdash-history-badge">✓ Returned</span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            {/* ============================================================
                SECTION 4 — QUICK ACTION LINKS
                ============================================================ */}
            <div className="mdash-actions">

              <Link to="/member/books" className="mdash-action-card action-discover">
                <span className="mdash-action-icon">🔍</span>
                <div className="mdash-action-body">
                  <p className="mdash-action-title">Discover Books</p>
                  <p className="mdash-action-desc">
                    Browse our full catalog, search by title or author, and borrow books.
                  </p>
                </div>
              </Link>

              <Link to="/member/loans" className="mdash-action-card action-loans">
                <span className="mdash-action-icon">📋</span>
                <div className="mdash-action-body">
                  <p className="mdash-action-title">My Loans</p>
                  <p className="mdash-action-desc">
                    See all your active loans, return books, and view your full borrowing history.
                  </p>
                </div>
              </Link>

            </div>

          </>
        )}

      </main>
    </div>
  );
}

export default MemberDashboard;
