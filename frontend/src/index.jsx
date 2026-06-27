import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/**
 * APPLICATION ENTRY POINT
 *
 * This is the very first file that runs when the app starts.
 *
 * What happens here:
 *  1. We find the <div id="root"> element in public/index.html
 *  2. We create a React "root" attached to that div
 *  3. We render the <App /> component inside it
 *
 * After this runs, React takes full control of the page.
 * Everything the user sees is drawn by React components.
 *
 * React.StrictMode is a development helper — it warns you about
 * common mistakes in your code. It does NOT affect the final build.
 */
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
