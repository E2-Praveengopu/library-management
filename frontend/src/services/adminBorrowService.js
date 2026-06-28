/**
 * ADMIN BORROW SERVICE — adminBorrowService.js
 *
 * Network calls for admin-level borrowing management.
 * All endpoints require an admin JWT token.
 */

import { BASE_URL, getToken } from "../utils/api";

function jsonHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

/**
 * Fetches all borrowing records (admin view, paginated + filterable).
 *
 * @param {{ page, limit, status, search }}
 *   status — "all" | "borrowed" | "returned" | "overdue"
 * @returns {{ pagination, stats, borrowings }}
 */
export async function getAllBorrowings({ page = 1, limit = 15, status = "all", search = "" } = {}) {
  const params = new URLSearchParams({ page, limit, status });
  if (search) params.append("search", search);

  const response = await fetch(`${BASE_URL}/api/admin/borrowings?${params.toString()}`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch borrowings.");
  return data;
}

/**
 * Admin issues a book to a member.
 *
 * @param {{ userId, bookId, dueDate? }}
 * @returns {{ message, borrowing }}
 */
export async function issueBorrow({ userId, bookId, dueDate }) {
  const body = { userId, bookId };
  if (dueDate) body.dueDate = dueDate;

  const response = await fetch(`${BASE_URL}/api/admin/borrowings/issue`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to issue book.");
  return data;
}

/**
 * Admin marks any borrowing as returned.
 *
 * @param {number} borrowId
 * @returns {{ message, borrowing }}
 */
export async function adminMarkReturned(borrowId) {
  const response = await fetch(`${BASE_URL}/api/admin/borrowings/${borrowId}/return`, {
    method: "PUT",
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to mark book as returned.");
  return data;
}

/**
 * Returns all ACTIVE members for the Issue Book modal's member dropdown.
 * Uses the member management endpoint with status=active and a high limit.
 *
 * @returns {{ members: Array<{ id, name, email }> }}
 */
export async function getMembers() {
  const params = new URLSearchParams({ status: "active", limit: 200, page: 1 });
  const response = await fetch(`${BASE_URL}/api/admin/members?${params.toString()}`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch members.");
  return data;
}

/**
 * Returns books that have at least 1 available copy.
 * Used by the Issue Book modal's book dropdown.
 *
 * @returns {{ books: Array<{ id, title, author, availableCopies }> }}
 */
export async function getAvailableBooks() {
  const response = await fetch(`${BASE_URL}/api/admin/available-books`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch available books.");
  return data;
}
