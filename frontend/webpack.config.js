const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

/**
 * WEBPACK CONFIGURATION
 *
 * Webpack is a "bundler" — it reads all our JavaScript and CSS files
 * and combines them into a single file (bundle.js) that the browser can load.
 *
 * Without webpack, browsers would struggle to handle hundreds of separate files
 * and modern JavaScript (JSX, ES modules, arrow functions) that old browsers
 * don't understand. Webpack + Babel solve both problems.
 */
module.exports = {
  // ENTRY: The starting file webpack reads first.
  // It will follow all the imports from this file and bundle everything together.
  entry: "./src/index.jsx",

  // OUTPUT: Where webpack should put the final bundled file.
  output: {
    path: path.resolve(__dirname, "dist"), // save it in the "dist" folder
    filename: "bundle.js",                // name the output file "bundle.js"
    publicPath: "/",                      // serve all assets from the root URL
  },

  // RESOLVE: Tell webpack which file extensions to recognise.
  // This lets us write: import Login from './Login'
  // instead of:        import Login from './Login.jsx'
  resolve: {
    extensions: [".js", ".jsx"],
  },

  // MODULE RULES: Instructions for how to handle different file types.
  module: {
    rules: [
      // RULE 1: Handle .js and .jsx files using Babel.
      // Babel converts modern JavaScript and JSX into plain JS
      // that older browsers can understand.
      {
        test: /\.(js|jsx)$/,      // apply this rule to files ending in .js or .jsx
        exclude: /node_modules/,  // skip the node_modules folder (already compiled)
        use: {
          loader: "babel-loader", // use the babel-loader plugin to process these files
        },
      },

      // RULE 2: Handle .css files.
      // css-loader reads the CSS file.
      // style-loader injects the CSS into the page as a <style> tag.
      // Note: loaders run RIGHT TO LEFT, so css-loader runs first, then style-loader.
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },

  // PLUGINS: Extra tools that add features beyond what loaders can do.
  plugins: [
    // HtmlWebpackPlugin automatically creates an index.html in the dist folder
    // and injects a <script> tag pointing to bundle.js.
    new HtmlWebpackPlugin({
      template: "./public/index.html", // use our own HTML file as the base
    }),
  ],

  // DEV SERVER: Settings for the local development server (npm start).
  devServer: {
    port: 3000,              // the app will run on http://localhost:3000
    historyApiFallback: true, // serve index.html for all routes (required for React Router)
    hot: true,               // auto-reload the browser when files change
  },
};
