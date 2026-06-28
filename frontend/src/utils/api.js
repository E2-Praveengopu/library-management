/**
 * API SHARED HELPERS — api.js
 *
 * This file provides two things used by every other API module:
 *   1. BASE_URL — the backend server address (change once here, applies everywhere)
 *   2. Auth token helpers — save, read, and delete JWT data from localStorage
 *
 * Feature-specific API calls live in their own files:
 *   authApi.js        — login, signup
 *   bookApi.js        — book catalog CRUD + search + genres
 *   borrowApi.js      — member borrow / return / my-books
 *   adminBorrowApi.js — admin issue, return, full borrowings list
 */

/** Base URL of the Express backend server */
export const BASE_URL = "http://localhost:5000";

// =============================================================================
// TOKEN HELPERS
// =============================================================================

/**
 * Saves JWT token, user role, and user object to localStorage after login/signup.
 *
 * @param {string} token
 * @param {string} role  - "admin" or "member"
 * @param {object} user  - { id, name, email, role }
 */
export function saveAuthData(token, role, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  localStorage.setItem("user", JSON.stringify(user));
}

/**
 * Returns the saved JWT token, or null if not logged in.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem("token");
}

/**
 * Returns the saved user role ("admin", "member"), or null.
 * @returns {string|null}
 */
export function getUserRole() {
  return localStorage.getItem("role");
}

/**
 * Returns the saved user object { id, name, email, role }, or null.
 * @returns {object|null}
 */
export function getUser() {
  const str = localStorage.getItem("user");
  return str ? JSON.parse(str) : null;
}

/**
 * Removes all auth data from localStorage.
 * Call on logout — all protected requests will fail after this.
 */
export function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
}

/**
 * Makes an authenticated GET request to a protected backend route.
 * Sends the saved JWT in the Authorization header.
 *
 * @param {string} url - Backend path, e.g. "/api/member/dashboard"
 * @returns {object}
 */
export async function fetchWithAuth(url) {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
