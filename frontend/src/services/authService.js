/**
 * AUTH SERVICE — authService.js
 *
 * Network calls for user authentication (login and signup).
 * Token storage helpers live in utils/api.js.
 */

import { BASE_URL, saveAuthData } from "../utils/api";

/**
 * Registers a new user account.
 *
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @param {string} role - "admin" or "member"
 * @returns {{ message, token, user }}
 */
export async function signupUser(name, email, password, role) {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Signup failed. Please try again.");

  saveAuthData(data.token, data.user.role, data.user);
  return data;
}

/**
 * Logs an existing user in.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ message, token, user }}
 */
export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Login failed. Please check your credentials.");

  saveAuthData(data.token, data.user.role, data.user);
  return data;
}
