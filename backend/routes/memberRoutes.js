const express = require("express");
const router = express.Router();
const { verifyToken, authorizeMember } = require("../middleware/authMiddleware");

/**
 * MEMBER ROUTES (Protected — Member only)
 *
 * All routes here go through two middleware functions:
 *  1. verifyToken    → checks that the request has a valid JWT token
 *  2. authorizeMember → checks that the logged-in user has the "member" role
 *
 * If either check fails, the request is blocked before reaching the route handler.
 *
 * Admins who try to access these routes will get a 403 Forbidden error.
 */

/**
 * GET /api/member/dashboard
 *
 * A sample member dashboard route.
 * Only accessible to users with role = "member".
 *
 * How to test:
 *  - Login as a member user to get a token
 *  - Send GET request with header:  Authorization: Bearer <your_token>
 */
router.get("/dashboard", verifyToken, authorizeMember, (req, res) => {
  // req.user is available here because verifyToken added it
  return res.status(200).json({
    message: `Welcome to the Member Dashboard, user ID: ${req.user.id}`,
    role: req.user.role,
  });
});

/**
 * GET /api/member/books
 *
 * A sample route to represent a member browsing available books.
 * Only members can access this.
 */
router.get("/books", verifyToken, authorizeMember, (req, res) => {
  return res.status(200).json({
    message: "Member: Here is the list of books available to you",
    accessedBy: req.user.id,
  });
});

module.exports = router;
