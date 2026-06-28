/**
 * MemberManagementContext.jsx
 *
 * Shared state for the Admin Member Management page.
 *
 * STATE MANAGED:
 *   members     → current page of member cards
 *   pagination  → page info (currentPage, totalPages, etc.)
 *   stats       → { total, active, inactive } — always over the full dataset
 *   loading     → true while fetching the member list
 *   error       → error message if the list fetch fails
 *
 *   statusFilter → "all" | "active" | "inactive" (tab filter)
 *   searchQuery  → controlled input value (debounced before API call)
 *   currentPage  → page number currently displayed
 *
 *   selectedMember    → full member profile object for the detail panel (null = closed)
 *   profileLoading    → true while fetching the individual member profile
 *   profileError      → error from the profile fetch
 *
 *   statusActionLoading → memberId currently being toggled (null = no action)
 *   statusActionError   → error from the last activate/deactivate call
 *
 * LIVE SEARCH:
 *   350ms debounce via useRef so every keystroke doesn't fire an API request.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { getAllMembers, getMemberById, toggleMemberStatus } from "../services/memberService";

const MemberManagementContext = createContext(null);

/**
 * Custom hook — call inside any child of <MemberManagementProvider>.
 * Usage: const { members, handleToggleStatus } = useMemberManagement();
 */
export function useMemberManagement() {
  const ctx = useContext(MemberManagementContext);
  if (!ctx) throw new Error("useMemberManagement must be used inside <MemberManagementProvider>");
  return ctx;
}

/**
 * MemberManagementProvider
 *
 * Wraps the /admin/members route in App.jsx.
 * Exposes all state and actions to child components via context.
 */
export function MemberManagementProvider({ children }) {

  // ── Members list ───────────────────────────────────────────────────────────
  const [members, setMembers]       = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalMembers: 0,
    hasNextPage: false, hasPreviousPage: false,
  });
  const [stats, setStats]           = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  // ── Filters ────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [currentPage, setCurrentPage]   = useState(1);

  // ── Member detail panel ────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError]     = useState("");

  // ── Per-card status toggle action ──────────────────────────────────────────
  const [statusActionLoading, setStatusActionLoading] = useState(null);
  const [statusActionError,   setStatusActionError]   = useState("");

  // Debounce timer
  const searchTimer = useRef(null);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(function () {
    fetchMembers(1, "all", "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ──────────────────────────────────────────────────────────

  /**
   * Fetches the paginated member list with the given filters.
   * All params are explicit to avoid stale closures.
   *
   * @param {number} page
   * @param {string} status - "all" | "active" | "inactive"
   * @param {string} search
   */
  async function fetchMembers(page, status, search) {
    setLoading(true);
    setError("");
    try {
      const data = await getAllMembers({ page, limit: 12, status, search });
      setMembers(data.members);
      setPagination(data.pagination);
      setStats(data.stats || { total: 0, active: 0, inactive: 0 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Filter handlers ────────────────────────────────────────────────────────

  /**
   * Debounced search — updates the input immediately but only calls the API
   * after the user has stopped typing for 350ms.
   *
   * @param {string} query
   */
  function handleSearchChange(query) {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(function () {
      fetchMembers(1, statusFilter, query);
    }, 350);
  }

  /**
   * Switches the status tab and reloads the list immediately.
   *
   * @param {string} status - "all" | "active" | "inactive"
   */
  function handleStatusFilter(status) {
    setStatusFilter(status);
    fetchMembers(1, status, searchQuery);
  }

  /** Pagination page click. */
  function handlePageChange(page) {
    fetchMembers(page, statusFilter, searchQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Member detail panel ────────────────────────────────────────────────────

  /**
   * Opens the detail panel for a specific member.
   * Fetches the full profile (loans + history) from the API.
   *
   * @param {number} memberId
   */
  async function openMemberProfile(memberId) {
    setProfileError("");
    setSelectedMember(null);     // clear old data first
    setProfileLoading(true);
    try {
      const data = await getMemberById(memberId);
      setSelectedMember(data);   // { member, activeLoans, history }
    } catch (err) {
      setProfileError(err.message);
      setSelectedMember({});     // open panel in error state
    } finally {
      setProfileLoading(false);
    }
  }

  /** Closes the member detail panel. */
  function closeMemberProfile() {
    setSelectedMember(null);
    setProfileError("");
  }

  // ── Activate / Deactivate ──────────────────────────────────────────────────

  /**
   * Toggles a member's isActive status.
   * Updates the member list optimistically on the card, then refreshes.
   *
   * @param {number}  memberId
   * @param {boolean} newStatus - true = activate, false = deactivate
   */
  async function handleToggleStatus(memberId, newStatus) {
    setStatusActionLoading(memberId);
    setStatusActionError("");
    try {
      await toggleMemberStatus(memberId, newStatus);

      // Optimistically update the card in the list so the UI doesn't blink
      setMembers(function (prev) {
        return prev.map(function (m) {
          return m.id === memberId ? { ...m, isActive: newStatus } : m;
        });
      });

      // Also update the detail panel if it's showing this member
      if (selectedMember && selectedMember.member && selectedMember.member.id === memberId) {
        setSelectedMember(function (prev) {
          return {
            ...prev,
            member: { ...prev.member, isActive: newStatus },
          };
        });
      }

      // Refresh stats counters
      await fetchMembers(currentPage, statusFilter, searchQuery);
    } catch (err) {
      setStatusActionError(err.message);
    } finally {
      setStatusActionLoading(null);
    }
  }

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    members, pagination, stats, loading, error,
    statusFilter, searchQuery, currentPage,
    selectedMember, profileLoading, profileError,
    statusActionLoading, statusActionError,

    handleSearchChange,
    handleStatusFilter,
    handlePageChange,
    openMemberProfile,
    closeMemberProfile,
    handleToggleStatus,
  };

  return (
    <MemberManagementContext.Provider value={value}>
      {children}
    </MemberManagementContext.Provider>
  );
}
