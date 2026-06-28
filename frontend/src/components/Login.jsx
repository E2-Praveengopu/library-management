import React, { Component } from "react";
import { Link } from "react-router-dom";
import { loginUser } from "../services/authService";
import withNavigate from "../utils/withNavigate";
import "../styles/auth.css";

/**
 * Login Component — Class-based
 *
 * This component renders the Login page where existing users sign in.
 *
 * STATE (data this component tracks):
 *   - email    : what the user has typed in the email field
 *   - password : what the user has typed in the password field
 *   - error    : an error message shown when login fails
 *   - loading  : true while waiting for the server to respond
 *
 * USER FLOW:
 *   1. User arrives at this page (the default "/" route)
 *   2. User types their email and password
 *   3. User clicks "Sign In"
 *   4. We call the backend POST /api/auth/login
 *   5a. Success → redirect to /admin/dashboard or /member/dashboard based on role
 *   5b. Failure → show the error message from the server
 *
 * NOTE: this.props.navigate is provided by the withNavigate HOC
 * (see src/utils/withNavigate.jsx for an explanation of why this is needed)
 */
class Login extends Component {
  /**
   * constructor() is the first method that runs when the component is created.
   *
   * We MUST call super(props) first — this initialises the React.Component base class.
   * Then we set up our initial state (all fields start empty).
   * We also bind our methods to "this" so they can access this.state inside them.
   *
   * Without binding, calling this.setState() inside handleChange() would throw
   * an error because "this" would be undefined.
   *
   * @param {object} props - Data passed into this component from parent components
   */
  constructor(props) {
    super(props); // always call super(props) first — this is a React requirement

    // Initial state — everything starts empty or false
    this.state = {
      email: "",
      password: "",
      error: "",      // no error message at the start
      loading: false, // we are not loading anything at the start
    };

    // Bind methods so that "this" works correctly inside them
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  /**
   * componentDidMount() is a React lifecycle method.
   * It runs automatically AFTER the component has appeared on screen.
   *
   * We use it here to check if the user is already logged in.
   * If they are, there is no need to show the login page —
   * we redirect them straight to their dashboard.
   *
   * For example: a logged-in admin who types "/" in the address bar
   * should be taken to /admin/dashboard automatically.
   */
  componentDidMount() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "admin") {
      this.props.navigate("/admin/dashboard");
    } else if (token && role === "member") {
      this.props.navigate("/member/dashboard");
    }
  }

  /**
   * handleChange() runs every time the user types a character in any input field.
   *
   * It reads two things from the input element that triggered the event:
   *   - event.target.name  → which field changed (e.g. "email" or "password")
   *   - event.target.value → what the user typed
   *
   * It then updates the matching piece of state.
   * For example, typing in <input name="email" /> will update this.state.email.
   *
   * The [name] syntax is called "computed property name" in JavaScript.
   * It means: use the VALUE of the name variable as the key.
   *
   * @param {object} event - The browser event object created when the user types
   */
  handleChange(event) {
    const fieldName = event.target.name;   // e.g. "email"
    const fieldValue = event.target.value; // e.g. "user@example.com"

    // Update only the field that changed, keep everything else the same
    this.setState({ [fieldName]: fieldValue });
  }

  /**
   * handleSubmit() runs when the user clicks the "Sign In" button.
   *
   * Steps:
   *   1. event.preventDefault() — stops the browser from reloading the page
   *      (the default behaviour of HTML forms — we handle submission ourselves)
   *   2. Set loading to true and clear any old error message
   *   3. Call loginUser() from our API utility (sends a POST request to the backend)
   *   4. If login succeeds, redirect to the correct dashboard based on role
   *   5. If login fails, catch the error and display the message to the user
   *
   * This method is "async" because loginUser() uses fetch() which takes time.
   * "await" pauses execution here until the network request is done.
   *
   * @param {object} event - The form submit event
   */
  async handleSubmit(event) {
    // Stop the form from doing a full page reload
    event.preventDefault();

    const { email, password } = this.state;

    // Clear previous errors and show loading state
    this.setState({ error: "", loading: true });

    try {
      // Send the login request to the backend
      // loginUser() is defined in src/utils/api.js
      const data = await loginUser(email, password);

      // Login was successful — redirect based on the user's role
      if (data.user.role === "admin") {
        this.props.navigate("/admin/dashboard");
      } else {
        this.props.navigate("/member/dashboard");
      }
    } catch (error) {
      // Login failed — show the error message and stop the loading spinner
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  }

  /**
   * render() is called by React whenever the component needs to draw itself.
   * It runs every time the state changes.
   *
   * It returns JSX — which looks like HTML but is actually JavaScript.
   * Babel converts this JSX into regular JavaScript before the browser runs it.
   *
   * @returns {JSX.Element} - The HTML structure of the Login page
   */
  render() {
    // Destructure state values so we can use them without "this.state." every time
    const { email, password, error, loading } = this.state;

    return (
      <div className="auth-page">
        <div className="auth-card">

          {/* --- Header: Logo, Title, Subtitle --- */}
          <div className="auth-header">
            <div className="auth-logo">Library</div>
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          {/* --- Error Message ---
              Only shown when the error state is not an empty string.
              The "&&" means: if error is truthy, render the div. */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* --- Login Form --- */}
          <form onSubmit={this.handleSubmit} className="auth-form">

            {/* Email input field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"              // must match the state key
                className="form-input"
                placeholder="Enter your email"
                value={email}             // controlled input — always shows what's in state
                onChange={this.handleChange}
                required
              />
            </div>

            {/* Password input field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={this.handleChange}
                required
              />
            </div>

            {/* Submit button
                disabled={loading} prevents double-clicks while the request is in flight */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* --- Switch Link: go to Signup page --- */}
          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Create one here
            </Link>
          </p>

        </div>
      </div>
    );
  }
}

// Wrap Login with the withNavigate HOC before exporting.
// This injects this.props.navigate so the class component can redirect the user.
export default withNavigate(Login);
