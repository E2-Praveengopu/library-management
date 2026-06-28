/**
 * SERVER ENTRY POINT
 *
 * This is the main file that starts the Express server.
 *
 * What happens here:
 *  1. Load environment variables from the .env file
 *  2. Create the uploads/books folder if it does not exist yet
 *  3. Connect to the PostgreSQL database via Sequelize
 *  4. Sync the database (auto-create tables if they don't exist)
 *  5. Register all routes
 *  6. Serve uploaded images as static files
 *  7. Start the server on the specified port
 */

// Load environment variables from .env file FIRST
// (must be before anything else that uses process.env)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const memberRoutes = require("./routes/memberRoutes");
const bookRoutes = require("./routes/bookRoutes");

// ─── MODELS ───────────────────────────────────────────────────────────────────
// We require all models here so Sequelize knows about them before calling sync().
// Even though controllers also require these models, we need them here to set up
// the associations (relationships between tables) before sync runs.
const User = require("./models/User");
const Book = require("./models/Book");
const Borrowing = require("./models/Borrowing");

// ─── MODEL ASSOCIATIONS ───────────────────────────────────────────────────────
// Associations define the foreign-key relationships between tables.
// They must be set up AFTER all models are defined and BEFORE sequelize.sync().
//
// hasMany / belongsTo together create the foreign key column in the "child" table.
// The "as" alias lets us write: borrowing.book instead of borrowing.Book
//
// Result: the Borrowings table gets two FK columns: userId, bookId

// A User (member) can have many Borrowing records over their lifetime
User.hasMany(Borrowing, { foreignKey: "userId", as: "borrowings" });
// Each Borrowing record belongs to exactly one User
Borrowing.belongsTo(User, { foreignKey: "userId", as: "user" });

// A Book can appear in many Borrowing records (borrowed many times over time)
Book.hasMany(Borrowing, { foreignKey: "bookId", as: "borrowings" });
// Each Borrowing record belongs to exactly one Book
Borrowing.belongsTo(Book, { foreignKey: "bookId", as: "book" });

// ─── ENSURE UPLOAD FOLDER EXISTS ──────────────────────────────────────────────

// Multer saves cover images to "uploads/books/" on the server's disk.
// This folder must exist before any image upload is attempted.
// { recursive: true } means it creates all parent folders too if they are missing.
// If the folder already exists, this does nothing (no error is thrown).
const uploadFolder = path.join(__dirname, "uploads", "books");
fs.mkdirSync(uploadFolder, { recursive: true });

// Create the Express application
const app = express();

// ─── MIDDLEWARE SETUP ──────────────────────────────────────────────────────────

// Enable CORS so that the frontend (running on a different port) can talk to this server
app.use(cors());

// Parse incoming JSON request bodies
// Without this, req.body would be undefined for POST requests with JSON data
app.use(express.json());

// ─── STATIC FILE SERVING ──────────────────────────────────────────────────────

// Serve files inside the "uploads/" folder as public static files.
// This allows the frontend to load cover images directly via URL.
//
// How it works:
//   A file saved at: uploads/books/book-123.jpg
//   Is accessible at: http://localhost:5000/uploads/books/book-123.jpg
//
// express.static() reads the file from disk and sends it to the browser.
// No custom route or controller is needed — Express handles it automatically.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── ROUTES SETUP ─────────────────────────────────────────────────────────────

// Public routes — no token needed
// All auth routes are prefixed with /api/auth
// Example: POST /api/auth/signup, POST /api/auth/login
app.use("/api/auth", authRoutes);

// Protected admin routes — only admins can access
// All admin routes are prefixed with /api/admin
// Example: GET /api/admin/dashboard
app.use("/api/admin", adminRoutes);

// Protected member routes — only members can access
// All member routes are prefixed with /api/member
// Example: GET /api/member/dashboard
app.use("/api/member", memberRoutes);

// Book catalog routes — mixed access
// GET routes: any authenticated user (admin or member)
// POST, PUT, DELETE routes: admin only
// All book routes are prefixed with /api/books
// Examples:
//   GET    /api/books         → list all books
//   GET    /api/books/5       → get book with ID 5
//   POST   /api/books         → add a new book (admin)
//   PUT    /api/books/5       → update book with ID 5 (admin)
//   DELETE /api/books/5       → delete book with ID 5 (admin)
app.use("/api/books", bookRoutes);

// ─── DEFAULT ROUTE ────────────────────────────────────────────────────────────

// A simple root route to confirm the server is running
app.get("/", (req, res) => {
  res.json({ message: "Library Management API is running" });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

/**
 * Connect to the database, then start the server.
 *
 * sequelize.sync() checks the database and creates any missing tables
 * based on the models we defined. { alter: true } updates existing tables
 * if the model has changed, without dropping existing data.
 *
 * We only start the HTTP server AFTER the database is ready.
 */
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database connected and tables are ready.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error.message);
    process.exit(1); // Exit the process if DB connection fails
  });
