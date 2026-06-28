/**
 * MemberManagement Page Component
 *
 * Admin's complete view of all registered library members.
 *
 * WHAT THIS PAGE OFFERS:
 *   - Summary stats: Total Members | Active | Inactive
 *   - Live search by name or email (350ms debounce)
 *   - Status filter tabs: All | Active | Inactive
 *   - Responsive card grid of member profiles
 *   - Each card shows: color avatar, name, email, loan stats, joined date,
 *     status badge, "View Profile" + "Activate / Deactivate" buttons
 *   - Clicking "View Profile" opens a slide-in side panel showing:
 *       - Member header (avatar, name, email, status, joined date)
 *       - Lifetime loan stats (Total, Active, Returned, Overdue)
 *       - Active Loans list with due dates and overdue flags
 *       - Borrowing History (last 20 returned books)
 *       - Activate / Deactivate button in the footer
 *   - Pagination at the bottom
 *
 * CONTEXT:
 *   Wrapped in <MemberManagementProvider> in App.jsx.
 *   All state and actions come from useMemberManagement().
 *
 * ACCESS CONTROL:
 *   Protected by ProtectedRoute with requiredRole="admin".
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/api";
import { useMemberManagement } from "../context/MemberManagementContext";
import "../styles/auth.css";
import "../styles/memberManagement.css";

// ── Avatar color palette ─────────────────────────────────────────────────────
// Colors are deterministically picked from the member's name so the same
// member always gets the same color, and adjacent cards vary.
const AVATAR_COLORS = [
  "#4299e1", "#48bb78", "#ed8936", "#9f7aea", "#f56565",
  "#38b2ac", "#667eea", "#e53e3e", "#d69e2e", "#319795",
];

/**
 * Returns a stable background color for a member's avatar,
 * derived from the character codes of their name.
 *
 * @param {string} name
 * @returns {string} - CSS color string
 */
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const sum = name.split("").reduce(function (acc, ch) { return acc + ch.charCodeAt(0); }, 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * Returns the initials (up to 2 letters) from a full name.
 *
 * @param {string} name
 * @returns {string} - e.g. "JD" for "John Doe"
 */
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
 * Returns true if a borrowing is past its due date.
 *
 * @param {object} b - Borrowing object with dueDate
 * @returns {boolean}
 */
function checkOverdue(b) {
  return b.dueDate && new Date(b.dueDate) < new Date();
}


// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

/**
 * MemberManagement functional component.
 * Composes the nav, stats, toolbar, filter tabs, member grid, pagination,
 * and the side panel overlay.
 */
function MemberManagement() {

  const navigate  = useNavigate();
  const adminUser = getUser();

  const {
    members, pagination, stats, loading, error,
    statusFilter, searchQuery, currentPage,
    selectedMember, profileLoading, profileError,
    statusActionLoading, statusActionError,

    handleSearchChange,
    handleStatusFilter,
    handlePageChange,
    openMemberProfile,
  } = useMemberManagement();

  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  // Pagination page numbers (window of 5)
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

  return (
    <div className="mm-page">

      {/* ================================================================
          STICKY NAV
          ================================================================ */}
      <nav className="mm-nav">
        <div className="mm-nav-left">
          <span className="mm-nav-logo">Library</span>
          <div className="mm-nav-divider" />
          <span className="mm-nav-title">Member Management</span>
        </div>
        <div className="mm-nav-right">
          <Link to="/admin/borrowings" className="mm-nav-link">Borrowings</Link>
          <Link to="/admin/books"      className="mm-nav-link">Books</Link>
          <Link to="/admin/dashboard"  className="mm-nav-link">Dashboard</Link>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <main className="mm-content">

        {/* Page title */}
        <div className="mm-page-header">
          <h1 className="mm-page-title">Member Management</h1>
          <p className="mm-page-subtitle">
            View, search, and manage all registered library members and their borrowing activity.
          </p>
        </div>

        {/* ── Summary Stats ─────────────────────────────────────────────── */}
        <div className="mm-stats">
          <div className="mm-stat-card">
            <div className="mm-stat-icon icon-total">👥</div>
            <div className="mm-stat-body">
              <span className="mm-stat-value">{stats.total}</span>
              <span className="mm-stat-label">Total Members</span>
            </div>
          </div>
          <div className="mm-stat-card">
            <div className="mm-stat-icon icon-active">✅</div>
            <div className="mm-stat-body">
              <span className="mm-stat-value">{stats.active}</span>
              <span className="mm-stat-label">Active</span>
            </div>
          </div>
          <div className="mm-stat-card">
            <div className="mm-stat-icon icon-inactive">🚫</div>
            <div className="mm-stat-body">
              <span className="mm-stat-value">{stats.inactive}</span>
              <span className="mm-stat-label">Inactive</span>
            </div>
          </div>
        </div>

        {/* ── Toolbar: Search ───────────────────────────────────────────── */}
        <div className="mm-toolbar">
          <div className="mm-search-wrap">
            <span className="mm-search-icon">🔍</span>
            <input
              type="text"
              className="mm-search-input"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={function (e) { handleSearchChange(e.target.value); }}
            />
          </div>
        </div>

        {/* ── Status Filter Tabs ────────────────────────────────────────── */}
        <div className="mm-tabs">
          {[
            { key: "all",      label: "All Members" },
            { key: "active",   label: "Active" },
            { key: "inactive", label: "Inactive", extraClass: "tab-inactive" },
          ].map(function (tab) {
            return (
              <button
                key={tab.key}
                className={`mm-tab ${tab.extraClass || ""} ${statusFilter === tab.key ? "active" : ""}`}
                onClick={function () { handleStatusFilter(tab.key); }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {error && <div className="mm-error">{error}</div>}

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loading && (
          <div className="mm-loading">
            <div className="mm-spinner" />
            <p>Loading members…</p>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!loading && members.length === 0 && (
          <div className="mm-empty">
            <span className="mm-empty-icon">👤</span>
            <h3>No Members Found</h3>
            <p>
              {searchQuery
                ? `No members match "${searchQuery}".`
                : statusFilter === "inactive"
                  ? "No deactivated accounts."
                  : "No members registered yet."}
            </p>
          </div>
        )}

        {/* ── Member Cards Grid ─────────────────────────────────────────── */}
        {!loading && members.length > 0 && (
          <div className="mm-grid">
            {members.map(function (member) {
              return (
                <MemberCard
                  key={member.id}
                  member={member}
                  onView={openMemberProfile}
                  statusActionLoading={statusActionLoading}
                  statusActionError={statusActionError}
                />
              );
            })}
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mm-pagination">
            <button
              className="mm-pagination-btn"
              onClick={function () { handlePageChange(currentPage - 1); }}
              disabled={!pagination.hasPreviousPage}
            >
              ← Prev
            </button>

            {pageNums[0] > 1 && (
              <>
                <button className="mm-pagination-page" onClick={function () { handlePageChange(1); }}>1</button>
                {pageNums[0] > 2 && <span className="mm-pagination-dots">…</span>}
              </>
            )}

            {pageNums.map(function (n) {
              return (
                <button
                  key={n}
                  className={`mm-pagination-page ${n === currentPage ? "active" : ""}`}
                  onClick={function () { handlePageChange(n); }}
                >
                  {n}
                </button>
              );
            })}

            {pageNums[pageNums.length - 1] < pagination.totalPages && (
              <>
                {pageNums[pageNums.length - 1] < pagination.totalPages - 1 && (
                  <span className="mm-pagination-dots">…</span>
                )}
                <button
                  className="mm-pagination-page"
                  onClick={function () { handlePageChange(pagination.totalPages); }}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}

            <button
              className="mm-pagination-btn"
              onClick={function () { handlePageChange(currentPage + 1); }}
              disabled={!pagination.hasNextPage}
            >
              Next →
            </button>
          </div>
        )}

      </main>

      {/* ── Member Detail Side Panel ──────────────────────────────────────── */}
      {selectedMember !== null && (
        <MemberDetailPanel
          profileLoading={profileLoading}
          profileError={profileError}
          statusActionLoading={statusActionLoading}
        />
      )}

    </div>
  );
}


// =============================================================================
// MEMBER CARD SUB-COMPONENT
// =============================================================================

/**
 * MemberCard
 *
 * Displays one member's info in a card grid layout.
 * Has View Profile and Activate/Deactivate buttons.
 *
 * @param {object} props.member
 * @param {function} props.onView        - Opens the detail panel
 * @param {number|null} props.statusActionLoading - ID of member being toggled
 * @param {string} props.statusActionError
 */
function MemberCard({ member, onView, statusActionLoading, statusActionError }) {

  const { handleToggleStatus } = useMemberManagement();
  const isThisLoading = statusActionLoading === member.id;

  return (
    <div className={`mm-card ${member.isActive ? "" : "card-inactive"}`}>

      {/* Header: avatar + name + email + status badge */}
      <div className="mm-card-header">
        <div
          className="mm-avatar"
          style={{ background: avatarColor(member.name) }}
        >
          {getInitials(member.name)}
        </div>

        <div className="mm-card-info">
          <p className="mm-card-name" title={member.name}>{member.name}</p>
          <p className="mm-card-email" title={member.email}>{member.email}</p>
        </div>

        <span className={`mm-status-badge ${member.isActive ? "badge-active" : "badge-inactive"}`}>
          {member.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Loan stats + joined date */}
      <div className="mm-card-meta">
        <div className="mm-meta-item">
          <span className="mm-meta-value">{member.totalLoansCount}</span>
          <span className="mm-meta-label">Total Loans</span>
        </div>
        <div className="mm-meta-item meta-active">
          <span className="mm-meta-value">{member.activeLoansCount}</span>
          <span className="mm-meta-label">Active Now</span>
        </div>
        <div className="mm-meta-item meta-joined">
          <span className="mm-meta-value">{fmt(member.joinedAt).split(" ").slice(1).join(" ")}</span>
          <span className="mm-meta-label">Joined</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mm-card-actions">
        <button
          className="mm-btn-view"
          onClick={function () { onView(member.id); }}
        >
          View Profile
        </button>

        {member.isActive ? (
          <button
            className="mm-btn-deactivate"
            onClick={function () { handleToggleStatus(member.id, false); }}
            disabled={isThisLoading}
          >
            {isThisLoading ? "Updating…" : "Deactivate"}
          </button>
        ) : (
          <button
            className="mm-btn-activate"
            onClick={function () { handleToggleStatus(member.id, true); }}
            disabled={isThisLoading}
          >
            {isThisLoading ? "Updating…" : "Activate"}
          </button>
        )}
      </div>

      {/* Inline error for this card's toggle action */}
      {isThisLoading === false && statusActionError && statusActionLoading === null && (
        <p className="mm-card-error">{statusActionError}</p>
      )}
    </div>
  );
}


// =============================================================================
// MEMBER DETAIL SIDE PANEL SUB-COMPONENT
// =============================================================================

/**
 * MemberDetailPanel
 *
 * A slide-in panel from the right showing the full member profile:
 *   - Header: avatar, name, email, status badge, joined date
 *   - Stats: total, active, returned, overdue loans
 *   - Active Loans list (with overdue highlight)
 *   - Borrowing History (up to 20 entries)
 *   - Footer: Activate / Deactivate toggle button
 *
 * All data comes from MemberManagementContext via useMemberManagement().
 */
function MemberDetailPanel({ profileLoading, profileError, statusActionLoading }) {

  const { selectedMember, closeMemberProfile, handleToggleStatus } = useMemberManagement();

  // selectedMember is either:
  //   {} (empty object = error state, profileError is set)
  //   { member, activeLoans, history } (success)
  //   null (panel closed — shouldn't render at all)

  const profile     = selectedMember && selectedMember.member;
  const activeLoans = selectedMember && selectedMember.activeLoans || [];
  const history     = selectedMember && selectedMember.history     || [];

  // The toggle button acts on the member currently in the panel
  const isThisLoading = profile && statusActionLoading === profile.id;

  return (
    <div
      className="mm-panel-overlay"
      onClick={function (e) { if (e.target === e.currentTarget) closeMemberProfile(); }}
    >
      <div className="mm-panel">

        {/* ── Panel Header ───────────────────────────────────────────── */}
        {profile && (
          <div className="mm-panel-head">
            <div
              className="mm-panel-avatar"
              style={{ background: avatarColor(profile.name) }}
            >
              {getInitials(profile.name)}
            </div>
            <div className="mm-panel-info">
              <p className="mm-panel-name">{profile.name}</p>
              <p className="mm-panel-email">{profile.email}</p>
              <div className="mm-panel-badges">
                <span className={`mm-status-badge ${profile.isActive ? "badge-active" : "badge-inactive"}`}>
                  {profile.isActive ? "Active" : "Inactive"}
                </span>
                <span className="mm-panel-joined">Joined {fmt(profile.joinedAt)}</span>
              </div>
            </div>
            <button className="mm-panel-close" onClick={closeMemberProfile}>×</button>
          </div>
        )}

        {/* Close button when loading / no profile yet */}
        {!profile && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
            <button className="mm-panel-close" onClick={closeMemberProfile}>×</button>
          </div>
        )}

        {/* ── Panel Body ─────────────────────────────────────────────── */}
        <div className="mm-panel-body">

          {/* Loading state */}
          {profileLoading && (
            <div className="mm-panel-loading">
              <div className="mm-panel-spinner" />
              <span>Loading profile…</span>
            </div>
          )}

          {/* Error state */}
          {!profileLoading && profileError && (
            <div className="mm-panel-error">{profileError}</div>
          )}

          {/* Deactivated account warning */}
          {!profileLoading && profile && !profile.isActive && (
            <div className="mm-panel-deactivated-banner">
              🚫 This account is deactivated — the member cannot log in.
            </div>
          )}

          {/* ── Lifetime Stats ──────────────────────────────────────── */}
          {!profileLoading && profile && profile.stats && (
            <>
              <div className="mm-panel-stats">
                <div className="mm-panel-stat">
                  <span className="mm-panel-stat-value">{profile.stats.totalLoans}</span>
                  <span className="mm-panel-stat-label">Total</span>
                </div>
                <div className="mm-panel-stat pstat-active">
                  <span className="mm-panel-stat-value">{profile.stats.activeLoans}</span>
                  <span className="mm-panel-stat-label">Active</span>
                </div>
                <div className="mm-panel-stat">
                  <span className="mm-panel-stat-value">{profile.stats.returnedLoans}</span>
                  <span className="mm-panel-stat-label">Returned</span>
                </div>
                <div className="mm-panel-stat pstat-overdue">
                  <span className="mm-panel-stat-value">{profile.stats.overdueLoans}</span>
                  <span className="mm-panel-stat-label">Overdue</span>
                </div>
              </div>

              {/* ── Active Loans ─────────────────────────────────────── */}
              <p className="mm-panel-section-title">Active Loans ({activeLoans.length})</p>

              {activeLoans.length === 0 ? (
                <p style={{ color: "#a0aec0", fontSize: "13px", marginBottom: "20px" }}>
                  No active loans.
                </p>
              ) : (
                activeLoans.map(function (loan) {
                  const overdue = checkOverdue(loan);
                  return (
                    <div key={loan.id} className={`mm-panel-loan ${overdue ? "loan-overdue" : ""}`}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="mm-panel-loan-title" title={loan.book ? loan.book.title : ""}>
                          {loan.book ? loan.book.title : "Unknown"}
                        </p>
                        <p className="mm-panel-loan-author">
                          {loan.book ? loan.book.author : ""}
                        </p>
                      </div>
                      <div className={`mm-panel-loan-due ${overdue ? "due-overdue" : ""}`}>
                        <div>Due: {fmt(loan.dueDate)}</div>
                        {overdue && <div className="mm-panel-overdue-tag">OVERDUE</div>}
                      </div>
                    </div>
                  );
                })
              )}

              {/* ── Borrowing History ─────────────────────────────────── */}
              <p className="mm-panel-section-title" style={{ marginTop: "20px" }}>
                Borrowing History ({history.length > 0 ? `last ${history.length}` : "none"})
              </p>

              {history.length === 0 ? (
                <p style={{ color: "#a0aec0", fontSize: "13px" }}>No borrowing history yet.</p>
              ) : (
                history.map(function (h) {
                  return (
                    <div key={h.id} className="mm-panel-hist-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="mm-panel-hist-title" title={h.book ? h.book.title : ""}>
                          {h.book ? h.book.title : "Unknown"}
                        </p>
                        <p className="mm-panel-hist-author">
                          {h.book ? h.book.author : ""}
                        </p>
                      </div>
                      <div className="mm-panel-hist-dates">
                        <div>Returned: {fmt(h.returnedAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* ── Panel Footer: Toggle Button ─────────────────────────────── */}
        {profile && (
          <div className="mm-panel-footer">
            {profile.isActive ? (
              <button
                className="mm-panel-toggle-btn btn-deactivate"
                onClick={function () { handleToggleStatus(profile.id, false); }}
                disabled={isThisLoading}
              >
                {isThisLoading ? "Updating…" : "🚫 Deactivate This Account"}
              </button>
            ) : (
              <button
                className="mm-panel-toggle-btn btn-activate"
                onClick={function () { handleToggleStatus(profile.id, true); }}
                disabled={isThisLoading}
              >
                {isThisLoading ? "Updating…" : "✅ Activate This Account"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


export default MemberManagement;
