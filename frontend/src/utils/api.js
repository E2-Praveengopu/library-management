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


// =============================================================================
// BOOK API CALLS
// Functions that talk to the backend /api/books routes
// Admin-only routes (POST, PUT, DELETE) require a valid admin JWT token.
// =============================================================================

/**
 * Fetches a paginated list of all books from the backend.
 *
 * The backend returns books in batches (pages) so we don't load thousands
 * of records at once. You control which page and how many books per page.
 *
 * @param {number} page  - Which page to fetch. Page 1 = first 10 books, page 2 = next 10, etc.
 * @param {number} limit - How many books to show per page (default: 10)
 * @returns {object} - { message, pagination: { currentPage, totalPages, totalBooks, ... }, books: [...] }
 * @throws {Error} - If the request fails or the token is invalid
 */
export async function getBooks(page = 1, limit = 10) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/books?page=${page}&limit=${limit}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch books.");
  }

  return data;
}

/**
 * Adds a new book to the library system.
 *
 * This uses multipart/form-data (not JSON) because we need to upload
 * the book's cover image file alongside the text fields.
 *
 * IMPORTANT: Do NOT set a Content-Type header manually here.
 * When you pass a FormData object as the body, the browser automatically
 * sets Content-Type to "multipart/form-data" and adds the required
 * "boundary" string that separates each field in the request body.
 *
 * Required FormData fields: title, author, isbn, genre, totalCopies
 * Optional FormData fields: availableCopies, coverImage (file)
 *
 * @param {FormData} formData - The book data including optional cover image file
 * @returns {object} - { message, book }  (the newly created book object)
 * @throws {Error} - If required fields are missing, ISBN is duplicate, or token is invalid
 */
export async function addBook(formData) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/books`, {
    method: "POST",
    headers: {
      // No Content-Type here — the browser sets it automatically for FormData
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to add book.");
  }

  return data;
}

/**
 * Updates an existing book's details.
 *
 * Only send the fields you want to change — all fields are optional.
 * If you include a new coverImage file, it replaces the old one on the server.
 *
 * @param {number}   id       - The book's unique ID in the database
 * @param {FormData} formData - The updated fields (any subset of book fields)
 * @returns {object} - { message, book }  (the updated book object)
 * @throws {Error} - If the book is not found or validation fails
 */
export async function updateBook(id, formData) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/books/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update book.");
  }

  return data;
}

/**
 * Permanently deletes a book from the library system.
 *
 * This also removes the cover image file from the server's uploads folder.
 * This action cannot be undone — always confirm with the user first.
 *
 * @param {number} id - The book's unique ID in the database
 * @returns {object} - { message }
 * @throws {Error} - If the book is not found or the token is invalid
 */
export async function deleteBook(id) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/books/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete book.");
  }

  return data;
}


// =============================================================================
// DISCOVERY & MEMBER API CALLS
// Functions used on the Book Discovery page (member-facing).
// =============================================================================

/**
 * Searches and filters books with full support for live search, genre filter,
 * availability filter, and pagination.
 *
 * Calls GET /api/books with query parameters built from the provided options.
 *
 * @param {object} options
 * @param {number} options.page          - Page number (default: 1)
 * @param {number} options.limit         - Results per page (default: 12)
 * @param {string} options.search        - Search text (matches title, author, isbn)
 * @param {string} options.genre         - Genre to filter by (empty = all genres)
 * @param {boolean} options.available    - If true, only return books with copies available
 * @returns {object} - { message, pagination, books }
 * @throws {Error} - If the request fails
 */
export async function searchBooks({ page = 1, limit = 12, search = "", genre = "", available = false } = {}) {
  const token = getToken();

  // Build query string — only include params that have real values
  // URLSearchParams handles encoding of special characters (spaces, &, etc.)
  const params = new URLSearchParams({ page, limit });
  if (search) params.append("search", search);
  if (genre) params.append("genre", genre);
  if (available) params.append("available", "true");

  const response = await fetch(`${BASE_URL}/api/books?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to search books.");
  }

  return data;
}

/**
 * Returns all distinct genres that exist in the book catalog.
 * Used to populate the genre filter chips on the discovery page.
 *
 * @returns {object} - { message, genres: ["Biography", "Fiction", ...] }
 * @throws {Error} - If the request fails
 */
export async function getGenres() {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/books/genres`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch genres.");
  }

  return data;
}

/**
 * Borrows a specific book for the currently logged-in member.
 *
 * Rules enforced by the backend:
 *   - The book must have at least 1 available copy
 *   - The member cannot borrow the same book twice simultaneously
 *
 * @param {number} bookId - The ID of the book to borrow
 * @returns {object} - { message, borrowing: { id, dueDate, status } }
 * @throws {Error} - If no copies are available, already borrowed, or token is invalid
 */
export async function borrowBook(bookId) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/member/borrow/${bookId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to borrow book.");
  }

  return data;
}

/**
 * Returns a borrowed book back to the library.
 *
 * @param {number} borrowId - The ID of the Borrowing record (NOT the book ID)
 * @returns {object} - { message, borrowing: { id, status, returnedAt } }
 * @throws {Error} - If the borrowing record is not found or already returned
 */
export async function returnBook(borrowId) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/member/return/${borrowId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to return book.");
  }

  return data;
}

/**
 * Retrieves all books borrowed by the currently logged-in member.
 * Includes both active ("borrowed") and past ("returned") records.
 *
 * @returns {object} - { message, borrowings: [{ id, status, dueDate, book: {...} }] }
 * @throws {Error} - If the request fails
 */
export async function getMyBorrowings() {
  const token = getToken();

  const response = await fetch(`${BASE_URL}/api/member/my-books`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch your borrowed books.");
  }

  return data;
}
