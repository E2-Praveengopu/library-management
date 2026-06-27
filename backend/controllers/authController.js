const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Generates a JWT (JSON Web Token) for a user.
 *
 * A JWT is a small piece of data (a string) that:
 *  - Contains the user's id and role (called the "payload")
 *  - Is signed with a secret key so the server can verify it later
 *  - Has an expiry time (here: 1 day)
 *
 * The client (frontend) will store this token and send it with every
 * protected request so the server knows who is making the request.
 *
 * @param {object} user - The user object from the database
 * @returns {string} - A signed JWT token string
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,     // store user's database ID inside the token
    role: user.role, // store user's role so middleware can check permissions
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET, // the secret key used to sign the token
    { expiresIn: "1d" }     // token expires after 1 day
  );

  return token;
};

/**
 * SIGNUP CONTROLLER
 *
 * Handles POST /api/auth/signup
 *
 * What it does step by step:
 *  1. Reads name, email, password, and role from the request body
 *  2. Checks if a user with that email already exists
 *  3. Hashes the password using bcryptjs (so we never store plain text)
 *  4. Creates a new user record in the database
 *  5. Generates a JWT token for the new user
 *  6. Sends back the token and user info as a response
 *
 * @param {object} req - The HTTP request object (contains body with user data)
 * @param {object} res - The HTTP response object (used to send back a response)
 */
const signup = async (req, res) => {
  try {
    // Step 1: Get user input from the request body
    const { name, email, password, role } = req.body;

    // Step 2: Make sure all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    // Step 3: Check if a user with this email already exists in the database
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    // Step 4: Hash the password before saving it
    // bcrypt.hash takes the plain password and a "salt rounds" number.
    // Salt rounds = 10 means bcrypt will process the password 2^10 = 1024 times,
    // making it very hard to crack even if the database is stolen.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 5: Create the new user in the database
    // We save the hashedPassword, NOT the original plain text password
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "member", // if no role is given, default to "member"
    });

    // Step 6: Generate a JWT token for the newly created user
    const token = generateToken(newUser);

    // Step 7: Send back a success response with the token and user info
    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    // If something unexpected goes wrong, send a 500 (server error) response
    console.error("Signup error:", error.message);
    return res.status(500).json({
      message: "Something went wrong during signup",
      error: error.message,
    });
  }
};

/**
 * LOGIN CONTROLLER
 *
 * Handles POST /api/auth/login
 *
 * What it does step by step:
 *  1. Reads email and password from the request body
 *  2. Finds the user in the database by email
 *  3. Compares the provided password with the stored hashed password
 *  4. If they match, generates and returns a JWT token
 *
 * @param {object} req - The HTTP request object (contains body with email and password)
 * @param {object} res - The HTTP response object (used to send back a response)
 */
const login = async (req, res) => {
  try {
    // Step 1: Get email and password from the request body
    const { email, password } = req.body;

    // Step 2: Make sure both fields are provided
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // Step 3: Look up the user in the database by their email address
    const user = await User.findOne({ where: { email } });

    // If no user is found with that email, return an error
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Step 4: Compare the plain text password with the hashed one stored in the DB
    // bcrypt.compare will hash the provided password and check if it matches
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    // If the passwords don't match, return an error
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Step 5: Password is correct — generate a JWT token for this user
    const token = generateToken(user);

    // Step 6: Send back the token and user info
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // Handle unexpected errors
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Something went wrong during login",
      error: error.message,
    });
  }
};

module.exports = { signup, login };
