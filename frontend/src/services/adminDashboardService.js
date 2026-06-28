/**
 * ADMIN DASHBOARD SERVICE — adminDashboardService.js
 *
 * Network call for the Admin Dashboard page.
 * Fetches all stats and recent activity from the backend in one request.
 */

import { BASE_URL, getToken } from "../utils/api";

/**
 * Fetches all data needed to populate the Admin Dashboard.
 *
 * @returns {{
 *   stats: { totalBooks, totalMembers, activeLoans, overdueLoans },
 *   recentBooks: Array,
 *   recentBorrows: Array
 * }}
 */
export async function getAdminDashboard() {
  const response = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load admin dashboard.");
  return data;
}
