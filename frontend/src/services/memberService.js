/**
 * MEMBER SERVICE — memberService.js
 *
 * Network calls for admin member management:
 *   GET  /api/admin/members              → getAllMembers
 *   GET  /api/admin/members/:id          → getMemberById
 *   PUT  /api/admin/members/:id/status   → toggleMemberStatus
 *
 * All endpoints require an admin JWT token.
 */

import { BASE_URL, getToken } from "../utils/api";

function jsonHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

/**
 * Fetches a paginated, searchable, filterable list of all members.
 *
 * @param {{ page, limit, status, search }}
 *   status — "all" | "active" | "inactive"
 *   search — matches name or email
 * @returns {{ pagination, stats, members }}
 */
export async function getAllMembers({ page = 1, limit = 12, status = "all", search = "" } = {}) {
  const params = new URLSearchParams({ page, limit, status });
  if (search) params.append("search", search);

  const response = await fetch(`${BASE_URL}/api/admin/members?${params.toString()}`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch members.");
  return data;
}

/**
 * Fetches a single member's full profile including their loan history.
 *
 * @param {number} memberId
 * @returns {{ member, activeLoans, history }}
 */
export async function getMemberById(memberId) {
  const response = await fetch(`${BASE_URL}/api/admin/members/${memberId}`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch member profile.");
  return data;
}

/**
 * Activates or deactivates a member's account.
 *
 * @param {number}  memberId
 * @param {boolean} isActive - true to activate, false to deactivate
 * @returns {{ message, member }}
 */
export async function toggleMemberStatus(memberId, isActive) {
  const response = await fetch(`${BASE_URL}/api/admin/members/${memberId}/status`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ isActive }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update member status.");
  return data;
}
