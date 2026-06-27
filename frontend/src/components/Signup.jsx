import React, { Component } from "react";
import { Link } from "react-router-dom";
import { signupUser } from "../utils/api";
import withNavigate from "../utils/withNavigate";
import "../styles/auth.css";

/**
 * Signup Component — Class-based
 *
 * This component renders the Signup (registration) page where new users
 * can create an account in the Library Management System.
 *
 * STATE (data this component tracks):
 *   - name     : what the user typed in the Full Name field
 *   - email    : what the user typed in the Email field
 *   - password : what the user typed in the Password field
 *   - role     : which radio button is selected — "member" or "admin"
 *   - error    : an error message shown when registration fails
 *   - loading  : true while waiting for the server to respond
 *
 * USER FLOW:
 *   1. User arrives at "/signup"
 *   2. User fills in their name, email, password, and selects a role
 *   3. User clicks "Create Account"
 *   4. We call the backend POST /api/auth/signup
 *   5a. Success → redirect to the appropriate dashboard
 *   5b. Failure → show the error message from the server
 */
class Signup extends Component {
  /**
   * constructor() sets up the initial state of the component.
   *
   * Note that role defaults to "member" — most new users will be members,
   * so we pre-select that radio button for convenience.
   *
   * @param {object} props - Properties passed into this component
   */
  constructor(props) {
    super(props); // must always call super(props) in class components

    this.state = {
      name: "",
      email: "",
      password: "",
      role: "member", // the "Member" radio button is selected by default
      error: "",
      loading: false,
    };

    // Bind methods to "this" so they can read and update this.state
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  /**
   * componentDidMount() runs after the component appears on screen.
   *
   * If the user already has a valid token saved in localStorage
   * (meaning they are already logged in), we skip the signup page
   * and redirect them directly to their dashboard.
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
   * handleChange() is a single handler that works for ALL form inputs.
   *
   * It works for:
   *   - Text inputs  : <input type="text" name="name" />
   *   - Email inputs : <input type="email" name="email" />
   *   - Password inputs : <input type="password" name="password" />
   *   - Radio buttons : <input type="radio" name="role" value="admin" />
   *
   * All of these fire an onChange event with event.target.name and event.target.value,
   * so this one method can handle every field in the form.
   *
   * @param {object} event - The browser event from the changed input
   */
  handleChange(event) {
    const fieldName = event.target.name;   // which input changed
    const fieldValue = event.target.value; // what the new value is

    this.setState({ [fieldName]: fieldValue });
  }

  /**
   * handleSubmit() sends the new user's data to the backend.
   *
   * Steps:
   *   1. Prevent the page from reloading (default form behaviour)
   *   2. Check that the password is at least 6 characters (client-side guard)
   *   3. Show loading state and clear any old errors
   *   4. Call signupUser() from our API utility
   *   5. On success: navigate to the correct dashboard
   *   6. On failure: display the error message from the server
   *
   * @param {object} event - The form submit event
   */
  async handleSubmit(event) {
    // Prevent the form from reloading the page
    event.preventDefault();

    const { name, email, password, role } = this.state;

    // Client-side validation: check password length before sending to server
    // This gives the user instant feedback without making a network request
    if (password.length < 6) {
      this.setState({ error: "Password must be at least 6 characters long." });
      return; // stop here — do not send the request
    }

    // Clear old errors and start the loading state
    this.setState({ error: "", loading: true });

    try {
      // Send the signup data to the backend
      // signupUser() is defined in src/utils/api.js
      const data = await signupUser(name, email, password, role);

      // Account created successfully — redirect to the correct dashboard
      if (data.user.role === "admin") {
        this.props.navigate("/admin/dashboard");
      } else {
        this.props.navigate("/member/dashboard");
      }
    } catch (error) {
      // Registration failed — display the server's error message
      this.setState({
        error: error.message,
        loading: false,
      });
    }
  }

  /**
   * render() returns the JSX that React will draw on the screen.
   * React re-runs this method every time the state changes.
   *
   * @returns {JSX.Element} - The HTML structure of the Signup page
   */
  render() {
    const { name, email, password, role, error, loading } = this.state;

    return (
      <div className="auth-page">
        <div className="auth-card">

          {/* --- Header --- */}
          <div className="auth-header">
            <div className="auth-logo">Library</div>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">
              Join the Library Management System today
            </p>
          </div>

          {/* --- Error Message Box ---
              Rendered only when the error state has a message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* --- Signup Form --- */}
          <form onSubmit={this.handleSubmit} className="auth-form">

            {/* Full Name field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="Enter your full name"
                value={name}
                onChange={this.handleChange}
                required
              />
            </div>

            {/* Email field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={this.handleChange}
                required
              />
            </div>

            {/* Password field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={this.handleChange}
                required
              />
            </div>

            {/* Role selection: Radio Buttons
                checked={role === "member"} means the radio is selected when
                this.state.role equals "member". React keeps the UI in sync with state.
                When the user clicks the other radio, handleChange updates state.role,
                which causes React to re-render with the new selection. */}
            <div className="form-group">
              <label className="form-label">Select Your Role</label>
              <div className="radio-group">

                {/* Member option */}
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="member"
                    checked={role === "member"}
                    onChange={this.handleChange}
                    className="radio-input"
                  />
                  <span className="radio-text">Member</span>
                </label>

                {/* Admin option */}
                <label className="radio-label">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === "admin"}
                    onChange={this.handleChange}
                    className="radio-input"
                  />
                  <span className="radio-text">Admin</span>
                </label>

              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* --- Switch link: go to Login page --- */}
          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/" className="auth-link">
              Sign in here
            </Link>
          </p>

        </div>
      </div>
    );
  }
}

// Export with the withNavigate HOC so this.props.navigate is available inside the class
export default withNavigate(Signup);
