const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Defines the User model.
 *
 * A model in Sequelize represents a table in the database.
 * Each property inside the model definition maps to a column in the "Users" table.
 *
 * Fields:
 *  - name     : the full name of the user
 *  - email    : the user's email address (must be unique)
 *  - password : the hashed password (we never store plain text passwords)
 *  - role     : either "admin" or "member" — controls what routes the user can access
 */
const User = sequelize.define("User", {
  // The user's display name
  name: {
    type: DataTypes.STRING,
    allowNull: false, // this field is required — cannot be empty
  },

  // The user's email address, used for login
  email: {
    type: DataTypes.STRING,
    allowNull: false,  // required field
    unique: true,      // no two users can have the same email
    validate: {
      isEmail: true,   // Sequelize will check that this looks like a valid email
    },
  },

  // The hashed password — bcryptjs will convert the plain password to this hash
  password: {
    type: DataTypes.STRING,
    allowNull: false, // required field
  },

  // The role determines what the user is allowed to do
  role: {
    type: DataTypes.ENUM("admin", "member"), // only these two values are allowed
    defaultValue: "member",                  // if no role is given, default to "member"
  },

  /**
   * isActive controls whether a member account is enabled.
   * Admins can deactivate a member to block login without deleting their data.
   * Deactivated members cannot log in and are excluded from borrowing.
   * Default: true (all new accounts start as active).
   */
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = User;
