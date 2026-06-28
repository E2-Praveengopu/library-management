import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import BookCatalog from "./pages/BookCatalog";
import { BookProvider } from "./context/BookContext";

/**
 * ProtectedRoute Component
 *
 * This component acts as a "security guard" for pages that require login.
 *
 * Before allowing the user to see a page, it checks two things:
 *   1. Is the user logged in? (Do they have a JWT token in localStorage?)
 *   2. Does their role match what the page requires? (admin or member)
 *
 * If either check fails, the user is redirected back to the Login page.
 *
 * Props:
 *   - children     : The page component to show if access is granted
 *   - requiredRole : The role needed to access this page ("admin" or "member")
 *
 * Usage example:
 *   <ProtectedRoute requiredRole="admin">
 *     <AdminDashboard />
 *   </ProtectedRoute>
 */
function ProtectedRoute({ children, requiredRole }) {
  // Check if a token exists in localStorage (user is logged in)
  const token = localStorage.getItem("token");

  // Check what role the logged-in user has
  const userRole = localStorage.getItem("role");

  // If there is no token, the user is not logged in
  // Send them to the Login page
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If the user's role does not match what this page requires,
  // deny access and send them to the Login page
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // All checks passed — show the requested page
  return children;
}

/**
 * App Component
 *
 * This is the root component of the application.
 * It sets up all the pages (routes) using React Router.
 *
 * React Router works like a traffic controller:
 *   - It looks at the current URL in the browser address bar
 *   - It finds the matching Route
 *   - It renders the component for that Route
 *
 * Route table:
 *   /                  → Login page (the default page)
 *   /signup            → Signup page
 *   /admin/dashboard   → Admin Dashboard (admin token required)
 *   /admin/books       → Book Catalog — add, edit, delete books (admin only)
 *   /member/dashboard  → Member Dashboard (member token required)
 *
 * NOTE on BookProvider:
 *   The BookCatalog route is wrapped in <BookProvider> which provides
 *   the shared book state (books list, pagination, modals) to the entire
 *   catalog page and all its child components via React Context.
 *   We wrap only the catalog route (not the whole app) so the context is
 *   only active when needed — keeping the app efficient.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no login required */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected route — only users with role "admin" can enter */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/*
          Book Catalog route — admin only.
          Wrapped in BookProvider so BookCatalog and all its child components
          (BookCard, BookForm, DeleteModal, etc.) can access the shared
          book state via useBookContext() without prop drilling.
        */}
        <Route
          path="/admin/books"
          element={
            <ProtectedRoute requiredRole="admin">
              <BookProvider>
                <BookCatalog />
              </BookProvider>
            </ProtectedRoute>
          }
        />

        {/* Protected route — only users with role "member" can enter */}
        <Route
          path="/member/dashboard"
          element={
            <ProtectedRoute requiredRole="member">
              <MemberDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
