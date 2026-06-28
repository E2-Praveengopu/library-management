/**
 * ADMIN BORROW API — adminBorrowApi.js
 *
 * Network calls for admin-level borrowing management.
 * All endpoints require an admin JWT token.
 *
 * ENDPOINTS COVERED:
 *   GET  /api/admin/borrowings           → getAllBorrowings (paginated, filterable)
 *   POST /api/admin/borrowings/issue     → issueBorrow
 *   PUT  /api/admin/borrowings/:id/return → adminMarkReturned
 *   GET  /api/admin/members              → getMembers
 *   GET  /api/admin/available-books      → getAvailableBooks
 */

import { BASE_URL, getToken } from "./api";

/** Shared auth header builder */
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

/**
 * Fetches all borrowing records (admin view).
 *
 * @param {{ page, limit, status, search }}
 *   status — "all" | "borrowed" | "returned" | "overdue"
 *   search — matches member name/email or book title
 * @returns {{ pagination, stats, borrowings }}
 */
export async function getAllBorrowings({ page = 1, limit = 15, status = "all", search = "" } = {}) {
  const params = new URLSearchParams({ page, limit, status });
  if (search) params.append("search", search);

  const response = await fetch(`${BASE_URL}/api/admin/borrowings?${params.toString()}`, {
    headers: authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch borrowings.");
  return data;
}

/**
 * Admin issues a book to a member.
 *
 * @param {{ userId: number, bookId: number, dueDate?: string }}
 *   dueDate — optional "YYYY-MM-DD", defaults to today + 14 days on the server
 * @returns {{ message, borrowing }}
 */
export async function issueBorrow({ userId, bookId, dueDate }) {
  const body = { userId, bookId };
  if (dueDate) body.dueDate = dueDate;

  const response = await fetch(`${BASE_URL}/api/admin/borrowings/issue`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to issue book.");
  return data;
}

/**
 * Admin marks any borrowing as returned.
 *
 * @param {number} borrowId - The Borrowing record's ID
 * @returns {{ message, borrowing }}
 */
export async function adminMarkReturned(borrowId) {
  const response = await fetch(`${BASE_URL}/api/admin/borrowings/${borrowId}/return`, {
    method: "PUT",
    headers: authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to mark book as returned.");
  return data;
}

/**
 * Returns all members (for the Issue Book modal's member dropdown).
 *
 * @returns {{ members: Array<{ id, name, email }> }}
 */
export async function getMembers() {
  const response = await fetch(`${BASE_URL}/api/admin/members`, {
    headers: authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch members.");
  return data;
}

/**
 * Returns books that currently have at least 1 available copy.
 * Used for the Issue Book modal's book dropdown.
 *
 * @returns {{ books: Array<{ id, title, author, availableCopies }> }}
 */
export async function getAvailableBooks() {
  const response = await fetch(`${BASE_URL}/api/admin/available-books`, {
    headers: authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch available books.");
  return data;
}
