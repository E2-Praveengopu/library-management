/**
 * MEMBER DASHBOARD SERVICE — memberDashboardService.js
 *
 * Network call for the Member Dashboard page.
 * Fetches the member's current loans, history, and stats in one request.
 */

import { BASE_URL, getToken } from "../utils/api";

/**
 * Fetches all data needed to populate the Member Dashboard.
 *
 * @returns {{
 *   stats: { totalBorrowed, activeBorrows, returned, overdue },
 *   activeLoans: Array,
 *   recentHistory: Array
 * }}
 */
export async function getMemberDashboard() {
  const response = await fetch(`${BASE_URL}/api/member/dashboard`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load member dashboard.");
  return data;
}
