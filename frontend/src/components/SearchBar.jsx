/**
 * SearchBar Component
 *
 * The live search input inside the discovery page hero banner.
 *
 * WHAT IT DOES:
 *   - Shows a text input where the member can type a book title, author, or ISBN
 *   - Calls onSearch() on every keystroke (the parent/context debounces the API call)
 *   - Shows a × clear button when there is text in the input
 *   - Displays a hint below the input
 *
 * LIVE SEARCH FLOW:
 *   1. Member types "gatsby"
 *   2. onChange fires → calls onSearch("gatsby") → updates state in DiscoveryContext
 *   3. DiscoveryContext debounces 350ms → sends GET /api/books?search=gatsby
 *   4. Results refresh below
 *
 * Props:
 *   value     {string}   - Controlled input value (from DiscoveryContext.searchQuery)
 *   onSearch  {function} - Called with the new input value on every keystroke
 */

import React, { useRef } from "react";
import "../styles/bookDiscovery.css";

/**
 * SearchBar functional component.
 *
 * @param {object}   props
 * @param {string}   props.value    - Current search text (controlled)
 * @param {function} props.onSearch - Callback called with new value on change
 */
function SearchBar({ value, onSearch }) {

  // Ref to the input DOM element — used to refocus after clearing
  const inputRef = useRef(null);

  /** Clears the search box and triggers a new empty search */
  function handleClear() {
    onSearch(""); // tell the parent the input is now empty
    inputRef.current && inputRef.current.focus(); // return focus to the input
  }

  return (
    <div className="discovery-search-wrap">

      {/* Search text input */}
      <input
        ref={inputRef}
        type="text"
        className="discovery-search-input"
        placeholder="Search by title, author, or ISBN…"
        value={value}
        onChange={function (e) { onSearch(e.target.value); }}
        aria-label="Search books"
        autoComplete="off"
        spellCheck="false"
      />

      {/* Clear × button — only visible when there is text */}
      {value && (
        <button
          className="discovery-search-clear"
          onClick={handleClear}
          type="button"
          aria-label="Clear search"
        >
          ×
        </button>
      )}

      {/* Hint text below the input */}
      <p className="discovery-search-hint">
        Results update automatically as you type
      </p>

    </div>
  );
}

export default SearchBar;
