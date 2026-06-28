/**
 * BORROW API — borrowApi.js
 *
 * Network calls for member self-service borrow and return operations.
 * Admin-issued borrows are in adminBorrowApi.js.
 */

import { BASE_URL, getToken } from "./api";

/**
 * Member borrows a book.
 *
 * @param {number} bookId
 * @returns {{ message, borrowing: { id, dueDate, status } }}
 */
export async function borrowBook(bookId) {
  const response = await fetch(`${BASE_URL}/api/member/borrow/${bookId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to borrow book.");
  return data;
}

/**
 * Member returns a borrowed book.
 *
 * @param {number} borrowId - ID of the Borrowing record (not the book)
 * @returns {{ message, borrowing: { id, status, returnedAt } }}
 */
export async function returnBook(borrowId) {
  const response = await fetch(`${BASE_URL}/api/member/return/${borrowId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to return book.");
  return data;
}

/**
 * Retrieves all borrowings for the logged-in member.
 * Includes both active ("borrowed") and past ("returned") records.
 *
 * @returns {{ borrowings: Array }}
 */
export async function getMyBorrowings() {
  const response = await fetch(`${BASE_URL}/api/member/my-books`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch your borrowed books.");
  return data;
}
