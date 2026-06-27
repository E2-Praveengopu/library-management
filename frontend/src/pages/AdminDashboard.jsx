import React from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth, getUser, clearAuthData } from "../utils/api";
import "../styles/auth.css";

/**
 * AdminDashboard Component
 *
 * This page is shown after an admin user logs in successfully.
 *
 * ACCESS CONTROL:
 *   This page is protected by the ProtectedRoute in App.jsx.
 *   Only users with role "admin" can reach this page.
 *   Any attempt to visit /admin/dashboard without an admin token
 *   will redirect back to the Login page automatically.
 *
 * WHAT IT DOES:
 *   1. Reads the saved user info from localStorage to show the user's name
 *   2. Makes an authenticated GET request to /api/admin/dashboard
 *      using the saved JWT token in the Authorization header
 *   3. Displays the response from the backend to confirm the token works
 *   4. Provides a Logout button to clear the token and return to login
 */
function AdminDashboard() {
  const navigate = useNavigate();

  // React state: null means the data hasn't loaded yet
  const [dashboardData, setDashboardData] = React.useState(null);
  const [error, setError] = React.useState("");

  // Get the user object saved in localStorage during login
  const user = getUser();

  /**
   * useEffect runs once after the component appears on screen.
   * The empty array [] at the end means "only run this once on mount".
   *
   * We use it to fetch the protected dashboard data from the backend.
   * This demonstrates that the JWT token is working correctly —
   * the backend will only respond if the token is valid and has role "admin".
   */
  React.useEffect(function () {
    async function loadDashboardData() {
      try {
        // fetchWithAuth automatically includes the JWT token in the request header
        // See src/utils/api.js for how this works
        const data = await fetchWithAuth("/api/admin/dashboard");
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadDashboardData();
  }, []); // empty array = run only once when the component mounts

  /**
   * handleLogout clears the saved JWT token from localStorage
   * and redirects the user back to the Login page.
   *
   * After this, any protected route will deny access until the user logs in again.
   */
  function handleLogout() {
    clearAuthData();   // remove token, role, and user from localStorage
    navigate("/");     // go to the Login page
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">

        {/* Top bar: Title + Logout button */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Admin Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, {user ? user.name : "Admin"}
            </p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        {/* Role badge */}
        <div className="dashboard-badge admin-badge">
          Role: Admin
        </div>

        {/* Error message if the backend request failed */}
        {error && <p className="error-message">{error}</p>}

        {/* Confirmation message from the backend API */}
        {dashboardData && (
          <div className="dashboard-info">
            <p>{dashboardData.message}</p>
          </div>
        )}

        {/* Feature cards — placeholders for admin functionality */}
        <div className="dashboard-grid">
          <div className="dashboard-item">
            <h3>Manage Users</h3>
            <p>View, update, and remove registered users from the system.</p>
          </div>
          <div className="dashboard-item">
            <h3>Manage Books</h3>
            <p>Add new books, update details, or remove books from the catalog.</p>
          </div>
          <div className="dashboard-item">
            <h3>View Reports</h3>
            <p>Access borrowing history, overdue books, and system reports.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;
