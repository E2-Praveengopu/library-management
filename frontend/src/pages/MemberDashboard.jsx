import React from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth, getUser, clearAuthData } from "../utils/api";
import "../styles/auth.css";

/**
 * MemberDashboard Component
 *
 * This page is shown after a member user logs in successfully.
 *
 * ACCESS CONTROL:
 *   This page is protected by the ProtectedRoute in App.jsx.
 *   Only users with role "member" can reach this page.
 *   Admins are NOT allowed — they will be redirected to login.
 *   Unauthenticated users are also redirected to login.
 *
 * WHAT IT DOES:
 *   1. Shows the logged-in member's name from localStorage
 *   2. Makes an authenticated GET request to /api/member/dashboard
 *      to confirm the JWT token works for member-protected routes
 *   3. Displays a Logout button
 */
function MemberDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = React.useState(null);
  const [error, setError] = React.useState("");

  const user = getUser();

  /**
   * useEffect fetches the member dashboard data from the backend
   * once the component appears on screen.
   *
   * The JWT token is sent automatically by fetchWithAuth().
   * The backend will verify the token and confirm the user has the "member" role
   * before returning a response.
   */
  React.useEffect(function () {
    async function loadDashboardData() {
      try {
        const data = await fetchWithAuth("/api/member/dashboard");
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadDashboardData();
  }, []);

  /**
   * handleLogout clears all saved auth data from localStorage
   * and sends the user back to the Login page.
   */
  function handleLogout() {
    clearAuthData();
    navigate("/");
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">

        {/* Top bar: Title + Logout button */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Member Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, {user ? user.name : "Member"}
            </p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        {/* Role badge */}
        <div className="dashboard-badge member-badge">
          Role: Member
        </div>

        {/* Error from the backend request */}
        {error && <p className="error-message">{error}</p>}

        {/* Backend confirmation message */}
        {dashboardData && (
          <div className="dashboard-info">
            <p>{dashboardData.message}</p>
          </div>
        )}

        {/* Feature cards — placeholders for member functionality */}
        <div className="dashboard-grid">
          <div className="dashboard-item">
            <h3>Browse Books</h3>
            <p>Explore all available books in the library collection.</p>
          </div>
          <div className="dashboard-item">
            <h3>Borrowed Books</h3>
            <p>View the books you have currently borrowed and their due dates.</p>
          </div>
          <div className="dashboard-item">
            <h3>Search Catalog</h3>
            <p>Find books by title, author, genre, or ISBN number.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default MemberDashboard;
