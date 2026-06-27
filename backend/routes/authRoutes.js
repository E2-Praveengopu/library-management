const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/authController");

/**
 * AUTH ROUTES (Public — no token required)
 *
 * These routes are open to everyone. No JWT token is needed.
 *
 * POST /api/auth/signup  → Create a new user account
 * POST /api/auth/login   → Login with email and password, receive a JWT token
 */

// Route: POST /api/auth/signup
// No middleware — anyone can register
router.post("/signup", signup);

// Route: POST /api/auth/login
// No middleware — anyone can attempt to login
router.post("/login", login);

module.exports = router;
