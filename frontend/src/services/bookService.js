/**
 * BOOK SERVICE — bookService.js
 *
 * All network calls for the book catalog:
 *   - Admin CRUD (add, update, delete)
 *   - Shared read (list, search, genres)
 *
 * Uses multipart/form-data for write operations because cover images
 * are uploaded as files. GET requests use JSON + Bearer token.
 */

import { BASE_URL, getToken } from "../utils/api";

/** Shared GET headers helper */
function jsonHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

/**
 * Fetches a paginated list of books (admin catalog view).
 *
 * @param {number} page
 * @param {number} limit
 * @returns {{ pagination, books }}
 */
export async function getBooks(page = 1, limit = 10) {
  const response = await fetch(`${BASE_URL}/api/books?page=${page}&limit=${limit}`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch books.");
  return data;
}

/**
 * Adds a new book (admin only). Send as FormData.
 *
 * @param {FormData} formData
 * @returns {{ message, book }}
 */
export async function addBook(formData) {
  const response = await fetch(`${BASE_URL}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add book.");
  return data;
}

/**
 * Updates an existing book (admin only).
 *
 * @param {number}   id
 * @param {FormData} formData
 * @returns {{ message, book }}
 */
export async function updateBook(id, formData) {
  const response = await fetch(`${BASE_URL}/api/books/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update book.");
  return data;
}

/**
 * Permanently deletes a book (admin only).
 *
 * @param {number} id
 * @returns {{ message }}
 */
export async function deleteBook(id) {
  const response = await fetch(`${BASE_URL}/api/books/${id}`, {
    method: "DELETE",
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to delete book.");
  return data;
}

/**
 * Searches and filters books for the member discovery page.
 *
 * @param {{ page, limit, search, genre, available }}
 * @returns {{ pagination, books }}
 */
export async function searchBooks({ page = 1, limit = 12, search = "", genre = "", available = false } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search)    params.append("search", search);
  if (genre)     params.append("genre", genre);
  if (available) params.append("available", "true");

  const response = await fetch(`${BASE_URL}/api/books?${params.toString()}`, {
    headers: jsonHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to search books.");
  return data;
}

/**
 * Returns all distinct genres in the catalog.
 *
 * @returns {{ genres: string[] }}
 */
export async function getGenres() {
  const response = await fetch(`${BASE_URL}/api/books/genres`, { headers: jsonHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch genres.");
  return data;
}
