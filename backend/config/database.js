const { Sequelize } = require("sequelize");

/**
 * Creates a Sequelize instance to connect to the PostgreSQL database.
 *
 * Sequelize is an ORM (Object Relational Mapper) that lets us work with
 * the database using JavaScript instead of writing raw SQL queries.
 *
 * We read the database credentials from the .env file using process.env
 * so that sensitive info is not hardcoded in the code.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME,     // database name
  process.env.DB_USER,     // database username
  process.env.DB_PASSWORD, // database password
  {
    host: process.env.DB_HOST, // where the database server is running (e.g. localhost)
    port: process.env.DB_PORT, // the port PostgreSQL listens on (default: 5432)
    dialect: "postgres",       // tells Sequelize we are using PostgreSQL
    logging: false,            // set to true if you want to see SQL queries in the terminal
  }
);

module.exports = sequelize;
