const jwt = require("jsonwebtoken");

/**
 * VERIFY TOKEN MIDDLEWARE
 *
 * This middleware checks if the incoming request has a valid JWT token.
 * It runs BEFORE the actual route handler, acting as a gatekeeper.
 *
 * How it works:
 *  1. It looks for the token in the "Authorization" header of the request.
 *     The header should look like:  Authorization: Bearer <token>
 *  2. It extracts the token from the header (removes the "Bearer " part)
 *  3. It verifies the token using the same secret key used to create it
 *  4. If valid, it attaches the decoded user info (id + role) to req.user
 *  5. If invalid or missing, it returns a 401 (Unauthorized) error
 *
 * Usage: Add this middleware to any route you want to protect.
 * Example:  router.get("/dashboard", verifyToken, (req, res) => { ... })
 *
 * @param {object} req  - The HTTP request object
 * @param {object} res  - The HTTP response object
 * @param {function} next - Calls the next function in the chain (the actual route handler)
 */
const verifyToken = (req, res, next) => {
  // Get the Authorization header value (looks like "Bearer eyJhbGci...")
  const authHeader = req.headers["authorization"];

  // If there is no Authorization header at all, block the request
  if (!authHeader) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  // The header format is "Bearer <token>", so we split by space and take the second part
  const token = authHeader.split(" ")[1];

  // If for some reason there is no token after "Bearer", block the request
  if (!token) {
    return res.status(401).json({
      message: "Access denied. Token is missing.",
    });
  }

  try {
    // Verify the token using the secret key
    // If the token is valid, jwt.verify returns the decoded payload (id + role)
    // If it's expired or tampered with, it throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user info to the request object
    // This makes req.user available in all route handlers that come after this middleware
    req.user = decoded;

    // Call next() to move on to the actual route handler
    next();
  } catch (error) {
    // Token is invalid (wrong signature) or expired
    return res.status(401).json({
      message: "Invalid or expired token. Please login again.",
    });
  }
};

/**
 * AUTHORIZE ADMIN MIDDLEWARE
 *
 * This middleware checks if the logged-in user has the "admin" role.
 * It must ALWAYS be used AFTER verifyToken because it relies on req.user
 * which is set by verifyToken.
 *
 * How it works:
 *  1. Checks the role stored in req.user (which was decoded from the JWT)
 *  2. If the role is "admin", allow the request to proceed
 *  3. If the role is anything else (like "member"), block with a 403 (Forbidden)
 *
 * Usage:
 *  router.get("/admin-only", verifyToken, authorizeAdmin, (req, res) => { ... })
 *
 * @param {object} req  - The HTTP request object (must have req.user from verifyToken)
 * @param {object} res  - The HTTP response object
 * @param {function} next - Calls the next middleware or route handler
 */
const authorizeAdmin = (req, res, next) => {
  // Check if the user's role is "admin"
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admins only.",
    });
  }

  // Role is admin — allow them through
  next();
};

/**
 * AUTHORIZE MEMBER MIDDLEWARE
 *
 * This middleware checks if the logged-in user has the "member" role.
 * It must ALWAYS be used AFTER verifyToken.
 *
 * How it works:
 *  1. Checks the role stored in req.user
 *  2. If the role is "member", allow the request to proceed
 *  3. If the role is "admin", block with 403 (Forbidden) — admins cannot access member routes
 *
 * Usage:
 *  router.get("/member-only", verifyToken, authorizeMember, (req, res) => { ... })
 *
 * @param {object} req  - The HTTP request object (must have req.user from verifyToken)
 * @param {object} res  - The HTTP response object
 * @param {function} next - Calls the next middleware or route handler
 */
const authorizeMember = (req, res, next) => {
  // Check if the user's role is "member"
  if (req.user.role !== "member") {
    return res.status(403).json({
      message: "Access denied. Members only.",
    });
  }

  // Role is member — allow them through
  next();
};

module.exports = { verifyToken, authorizeAdmin, authorizeMember };
