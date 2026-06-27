const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAdmin } = require("../middleware/authMiddleware");

/**
 * ADMIN ROUTES (Protected — Admin only)
 *
 * All routes here go through two middleware functions:
 *  1. verifyToken   → checks that the request has a valid JWT token
 *  2. authorizeAdmin → checks that the logged-in user has the "admin" role
 *
 * If either check fails, the request is blocked before reaching the route handler.
 *
 * Members who try to access these routes will get a 403 Forbidden error.
 */

/**
 * GET /api/admin/dashboard
 *
 * A sample admin dashboard route.
 * Only accessible to users with role = "admin".
 *
 * How to test:
 *  - Login as an admin user to get a token
 *  - Send GET request with header:  Authorization: Bearer <your_token>
 */
router.get("/dashboard", verifyToken, authorizeAdmin, (req, res) => {
  // req.user is available here because verifyToken added it
  return res.status(200).json({
    message: `Welcome to the Admin Dashboard, user ID: ${req.user.id}`,
    role: req.user.role,
  });
});

/**
 * GET /api/admin/users
 *
 * A sample route to represent an admin viewing all users.
 * Only admins can access this.
 */
router.get("/users", verifyToken, authorizeAdmin, (req, res) => {
  return res.status(200).json({
    message: "Admin: Here is the list of all users (admin-only data)",
    accessedBy: req.user.id,
  });
});

module.exports = router;
