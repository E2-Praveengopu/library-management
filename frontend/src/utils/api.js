/**
 * API UTILITY FILE
 *
 * This file is the single place where all communication with the backend happens.
 * Instead of writing fetch() calls scattered across every component, they all live here.
 * This keeps components clean and makes it easy to change the API later in one place.
 *
 * BACKEND BASE URL:
 *   The backend Express server runs on http://localhost:5000
 *
 * JWT TOKEN STORAGE:
 *   After a successful login or signup, the backend sends us a JWT token.
 *   We save it in localStorage (browser storage that persists across page refreshes).
 *   On every protected request, we send this token in the Authorization header
 *   so the backend middleware knows who is making the request.
 */

// The base URL of the backend server — change this if the server moves to a different port
const BASE_URL = "http://localhost:5000";

// =============================================================================
// TOKEN HELPERS
// Functions that save, read, and delete auth data from localStorage
// =============================================================================

/**
 * Saves the JWT token, user role, and user object to localStorage.
 *
 * Call this after a successful login or signup.
 * The data will persist in the browser even after the page is closed.
 *
 * @param {string} token - The JWT token returned by the backend
 * @param {string} role  - The user role: "admin" or "member"
 * @param {object} user  - The full user object { id, name, email, role }
 */
export function saveAuthData(token, role, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  // JSON.stringify converts the object to a string because localStorage only stores strings
  localStorage.setItem("user", JSON.stringify(user));
}

/**
 * Retrieves the saved JWT token from localStorage.
 * Returns null if the user is not logged in.
 *
 * @returns {string|null} - The JWT token string, or null if not found
 */
export function getToken() {
  return localStorage.getItem("token");
}

/**
 * Retrieves the saved user role from localStorage.
 *
 * @returns {string|null} - "admin", "member", or null if not logged in
 */
export function getUserRole() {
  return localStorage.getItem("role");
}

/**
 * Retrieves the saved user object from localStorage.
 *
 * @returns {object|null} - The user object { id, name, email, role }, or null
 */
export function getUser() {
  const userString = localStorage.getItem("user");
  // JSON.parse converts the stored string back into a JavaScript object
  return userString ? JSON.parse(userString) : null;
}

/**
 * Removes all saved auth data from localStorage.
 *
 * Call this when the user clicks "Logout".
 * After this, getToken() will return null and protected routes will redirect to login.
 */
export function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
}

// =============================================================================
// AUTH API CALLS
// Functions that talk to the backend /api/auth routes
// =============================================================================

/**
 * Sends a signup request to the backend.
 *
 * What it does step by step:
 *   1. Sends the user's data as JSON to POST /api/auth/signup
 *   2. If the server responds with an error, throws an Error with the message
 *   3. If successful, saves the JWT token and user info to localStorage
 *   4. Returns the response data so the component knows what to do next
 *
 * @param {string} name     - The user's full name
 * @param {string} email    - The user's email address
 * @param {string} password - The user's plain text password (server will hash it)
 * @param {string} role     - "admin" or "member"
 * @returns {object} - { message, token, user } from the backend
 * @throws {Error} - If the request fails (duplicate email, server error, etc.)
 */
export async function signupUser(name, email, password, role) {
  // fetch() is the built-in browser function for making HTTP requests
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",  // POST means we are sending data to create something new
    headers: {
      "Content-Type": "application/json", // tell the server we are sending JSON data
    },
    // JSON.stringify converts our JavaScript object into a JSON string
    body: JSON.stringify({ name, email, password, role }),
  });

  // Parse the JSON response body from the server into a JavaScript object
  const data = await response.json();

  // response.ok is true for status codes 200-299, false for 400, 409, 500, etc.
  if (!response.ok) {
    // The server sent an error — throw it so the calling component can catch and display it
    throw new Error(data.message || "Signup failed. Please try again.");
  }

  // Signup succeeded — save the auth data to localStorage
  saveAuthData(data.token, data.user.role, data.user);

  return data;
}

/**
 * Sends a login request to the backend.
 *
 * What it does step by step:
 *   1. Sends email and password as JSON to POST /api/auth/login
 *   2. If the server responds with an error, throws an Error with the message
 *   3. If successful, saves the JWT token and user info to localStorage
 *   4. Returns the response data
 *
 * @param {string} email    - The user's email address
 * @param {string} password - The user's plain text password
 * @returns {object} - { message, token, user } from the backend
 * @throws {Error} - If the credentials are wrong or the server fails
 */
export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed. Please check your credentials.");
  }

  // Login succeeded — save the auth data
  saveAuthData(data.token, data.user.role, data.user);

  return data;
}

/**
 * Makes an authenticated GET request to a protected backend route.
 *
 * What it does:
 *   1. Reads the saved JWT token from localStorage
 *   2. Sends it in the "Authorization: Bearer <token>" header
 *   3. The backend middleware will verify the token and allow or deny the request
 *   4. Returns the response data if the request succeeds
 *
 * Why the "Bearer" prefix?
 *   "Bearer" is a standard HTTP convention that means "the holder of this token".
 *   The backend's verifyToken middleware splits the header on a space and reads the token.
 *
 * @param {string} url - The backend path to call (e.g. "/api/admin/dashboard")
 * @returns {object} - The parsed response data from the backend
 * @throws {Error} - If the token is invalid/expired or the request fails
 */
export async function fetchWithAuth(url) {
  const token = getToken(); // get the saved JWT token

  const response = await fetch(`${BASE_URL}${url}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // attach the JWT token so the backend can verify us
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}
