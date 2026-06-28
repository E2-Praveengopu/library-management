/**
 * AdminDashboard Page Component
 *
 * The first page an admin sees after logging in.
 *
 * WHAT THIS PAGE SHOWS:
 *
 *   1. STAT CARDS (top row)
 *      Four big numbers pulled live from the backend:
 *        - Total Books     → how many books are in the catalog
 *        - Total Members   → how many member accounts exist
 *        - Active Loans    → books currently borrowed (not returned)
 *        - Overdue Loans   → active loans that are past their due date
 *
 *   2. RECENTLY ADDED BOOKS (left panel)
 *      The 5 newest books added to the catalog.
 *      Shows: cover thumbnail, title, author, genre, date added, available copies.
 *
 *   3. RECENT BORROWINGS (right panel)
 *      The 5 most recent borrow records.
 *      Shows: member name (with coloured initial avatar), book title,
 *      status badge (Active / Overdue / Returned), and due date.
 *
 *   4. QUICK LINKS (bottom row)
 *      Three shortcut cards to navigate to Books, Members, and Borrowings.
 *
 * HOW DATA IS LOADED:
 *   - One API call to GET /api/admin/dashboard on mount
 *   - getAdminDashboard() from adminDashboardService.js sends the JWT token
 *   - While loading: spinner is shown
 *   - On error: error message is shown
 *
 * ACCESS:
 *   Protected by ProtectedRoute in App.jsx — only users with role "admin" can see this.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { getAdminDashboard } from "../services/adminDashboardService";
import "../styles/auth.css";
import "../styles/adminDashboard.css";


// ── Small helper functions ───────────────────────────────────────────────────

/**
 * Formats a date string into a readable format like "15 Jun 2025".
 *
 * @param {string} dateStr - Any valid date string
 * @returns {string}
 */
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/**
 * A list of background colors for member initials avatars.
 * The color is chosen based on the member's name so the same member
 * always gets the same color.
 */
const AVATAR_COLORS = [
  "#4299e1", "#48bb78", "#ed8936", "#9f7aea",
  "#f56565", "#38b2ac", "#667eea", "#d69e2e",
];

/**
 * Returns a stable color for a member's avatar based on their name.
 *
 * @param {string} name
 * @returns {string} - CSS color
 */
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const sum = name.split("").reduce(function (acc, ch) {
    return acc + ch.charCodeAt(0);
  }, 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * Returns the first letter of a name (uppercased), used for the avatar.
 *
 * @param {string} name
 * @returns {string}
 */
function initial(name) {
  return name ? name[0].toUpperCase() : "?";
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================

function AdminDashboard() {

  const navigate = useNavigate();
  const user     = getUser(); // the logged-in admin's info from localStorage

  // ── State ──────────────────────────────────────────────────────────────────
  // dashboardData holds the API response when it loads successfully.
  // It will look like: { stats, recentBooks, recentBorrows }
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  // ── Load data on mount ─────────────────────────────────────────────────────
  // useEffect with [] runs once when the component first appears on screen.
  useEffect(function () {
    async function loadDashboard() {
      try {
        const data = await getAdminDashboard();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []); // the empty array [] means "run this once on load, never again"

  // ── Logout ─────────────────────────────────────────────────────────────────
  function handleLogout() {
    clearAuthData(); // removes token, role, user from localStorage
    navigate("/");   // redirect to login
  }

  // ── Extract data from the API response (with safe defaults) ───────────────
  // Optional chaining (?.) means "if dashboardData is null, don't crash — return undefined"
  // The || 0 / || [] part gives us safe fallback values while loading
  const stats        = dashboardData?.stats         || { totalBooks: 0, totalMembers: 0, activeLoans: 0, overdueLoans: 0 };
  const recentBooks  = dashboardData?.recentBooks   || [];
  const recentBorrows = dashboardData?.recentBorrows || [];

  return (
    <div className="adash-page">

      {/* ==================================================================
          STICKY NAVIGATION BAR
          ================================================================== */}
      <nav className="adash-nav">
        <div className="adash-nav-left">
          <span className="adash-nav-logo">Library</span>
          <div className="adash-nav-divider" />
          <span className="adash-nav-title">Admin Dashboard</span>
        </div>
        <div className="adash-nav-right">
          <Link to="/admin/books"      className="adash-nav-link">Books</Link>
          <Link to="/admin/members"    className="adash-nav-link">Members</Link>
          <Link to="/admin/borrowings" className="adash-nav-link">Borrowings</Link>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ==================================================================
          MAIN CONTENT
          ================================================================== */}
      <main className="adash-content">

        {/* Welcome greeting */}
        <div className="adash-welcome">
          <h1 className="adash-welcome-title">
            Welcome back, {user ? user.name : "Admin"} 👋
          </h1>
          <p className="adash-welcome-subtitle">
            Here is what is happening in your library today.
          </p>
        </div>

        {/* ── Loading Spinner ──────────────────────────────────────────── */}
        {loading && (
          <div className="adash-loading">
            <div className="adash-spinner" />
            <p>Loading dashboard data…</p>
          </div>
        )}

        {/* ── Error Message ────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="adash-error">
            Could not load dashboard: {error}
          </div>
        )}

        {/* ── Dashboard Content (only shown when data is loaded) ────────── */}
        {!loading && !error && dashboardData && (
          <>

            {/* ============================================================
                SECTION 1 — STAT CARDS
                Four numbers: total books, members, active loans, overdue
                ============================================================ */}
            <div className="adash-stats">

              {/* Card 1: Total Books */}
              <div className="adash-stat stat-books">
                <div className="adash-stat-icon">📚</div>
                <div className="adash-stat-body">
                  <span className="adash-stat-value">{stats.totalBooks}</span>
                  <span className="adash-stat-label">Total Books</span>
                </div>
              </div>

              {/* Card 2: Total Members */}
              <div className="adash-stat stat-members">
                <div className="adash-stat-icon">👥</div>
                <div className="adash-stat-body">
                  <span className="adash-stat-value">{stats.totalMembers}</span>
                  <span className="adash-stat-label">Total Members</span>
                </div>
              </div>

              {/* Card 3: Active Loans */}
              <div className="adash-stat stat-active">
                <div className="adash-stat-icon">📖</div>
                <div className="adash-stat-body">
                  <span className="adash-stat-value">{stats.activeLoans}</span>
                  <span className="adash-stat-label">Active Loans</span>
                </div>
              </div>

              {/* Card 4: Overdue Loans */}
              <div className="adash-stat stat-overdue">
                <div className="adash-stat-icon">⚠️</div>
                <div className="adash-stat-body">
                  <span className="adash-stat-value">{stats.overdueLoans}</span>
                  <span className="adash-stat-label">Overdue Loans</span>
                </div>
              </div>

            </div>


            {/* ============================================================
                SECTION 2 — TWO PANELS SIDE BY SIDE
                Left:  Recently Added Books
                Right: Recent Borrowings
                ============================================================ */}
            <div className="adash-panels">

              {/* LEFT PANEL — Recently Added Books ──────────────────────── */}
              <div className="adash-panel">

                {/* Panel header */}
                <div className="adash-panel-head">
                  <h2 className="adash-panel-title">Recently Added Books</h2>
                  <Link to="/admin/books" className="adash-panel-link">View all →</Link>
                </div>

                {/* Empty state */}
                {recentBooks.length === 0 && (
                  <div className="adash-panel-empty">
                    <span className="adash-panel-empty-icon">📚</span>
                    No books added yet.
                  </div>
                )}

                {/* Book list rows */}
                {recentBooks.map(function (book) {
                  return (
                    <div key={book.id} className="adash-book-row">

                      {/* Cover thumbnail */}
                      <div className="adash-book-thumb">
                        {book.coverImageUrl ? (
                          <img src={book.coverImageUrl} alt={book.title} />
                        ) : (
                          <span className="adash-book-thumb-icon">📖</span>
                        )}
                      </div>

                      {/* Title, author, genre, date */}
                      <div className="adash-book-info">
                        <p className="adash-book-title" title={book.title}>
                          {book.title}
                        </p>
                        <p className="adash-book-author">{book.author}</p>
                        <div className="adash-book-meta">
                          <span className="adash-book-genre">{book.genre}</span>
                          <span className="adash-book-date">Added {fmt(book.addedOn)}</span>
                        </div>
                      </div>

                      {/* Available copies count */}
                      <div className="adash-book-copies">
                        <span className="adash-copies-num">{book.availableCopies}</span>
                        <span className="adash-copies-label">available</span>
                      </div>

                    </div>
                  );
                })}
              </div>


              {/* RIGHT PANEL — Recent Borrowings ──────────────────────── */}
              <div className="adash-panel">

                {/* Panel header */}
                <div className="adash-panel-head">
                  <h2 className="adash-panel-title">Recent Borrowings</h2>
                  <Link to="/admin/borrowings" className="adash-panel-link">View all →</Link>
                </div>

                {/* Empty state */}
                {recentBorrows.length === 0 && (
                  <div className="adash-panel-empty">
                    <span className="adash-panel-empty-icon">📋</span>
                    No borrowings recorded yet.
                  </div>
                )}

                {/* Borrowing list rows */}
                {recentBorrows.map(function (b) {

                  // Determine the status label and CSS class for the badge
                  let statusLabel = "Returned";
                  let statusClass = "status-returned";
                  if (b.status === "borrowed" && b.isOverdue) {
                    statusLabel = "Overdue";
                    statusClass = "status-overdue";
                  } else if (b.status === "borrowed") {
                    statusLabel = "Active";
                    statusClass = "status-active";
                  }

                  return (
                    <div key={b.id} className="adash-borrow-row">

                      {/* Member initial circle */}
                      <div
                        className="adash-member-initial"
                        style={{ background: avatarColor(b.member.name) }}
                      >
                        {initial(b.member.name)}
                      </div>

                      {/* Member name + book title */}
                      <div className="adash-borrow-info">
                        <p className="adash-borrow-member" title={b.member.name}>
                          {b.member.name}
                        </p>
                        <p className="adash-borrow-book" title={b.book.title}>
                          {b.book.title}
                        </p>
                      </div>

                      {/* Status badge + due date */}
                      <div className="adash-borrow-right">
                        <span className={`adash-borrow-status ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {b.dueDate && (
                          <span className="adash-borrow-due">
                            Due: {fmt(b.dueDate)}
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>


            {/* ============================================================
                SECTION 3 — QUICK NAVIGATION LINKS
                Shortcuts to the three main admin sections
                ============================================================ */}
            <div className="adash-links">

              <Link to="/admin/books" className="adash-link-card link-blue">
                <span className="adash-link-icon">📚</span>
                <div>
                  <p className="adash-link-title">Book Catalog</p>
                  <p className="adash-link-desc">Add, edit, or remove books from the library.</p>
                  <span className="adash-link-arrow">Open Catalog →</span>
                </div>
              </Link>

              <Link to="/admin/members" className="adash-link-card link-purple">
                <span className="adash-link-icon">👥</span>
                <div>
                  <p className="adash-link-title">Member Management</p>
                  <p className="adash-link-desc">View member profiles and manage account status.</p>
                  <span className="adash-link-arrow">Manage Members →</span>
                </div>
              </Link>

              <Link to="/admin/borrowings" className="adash-link-card link-green">
                <span className="adash-link-icon">🔄</span>
                <div>
                  <p className="adash-link-title">Borrow Management</p>
                  <p className="adash-link-desc">Issue books, process returns, track overdue loans.</p>
                  <span className="adash-link-arrow">Manage Loans →</span>
                </div>
              </Link>

            </div>

          </>
        )}

      </main>
    </div>
  );
}

export default AdminDashboard;
