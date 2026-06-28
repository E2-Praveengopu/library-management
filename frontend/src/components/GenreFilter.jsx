/**
 * GenreFilter Component
 *
 * A horizontal row of clickable genre "chip" buttons for filtering books.
 *
 * WHAT IT SHOWS:
 *   [All Genres]  [Fiction]  [Biography]  [Science]  [History]  …
 *
 * BEHAVIOUR:
 *   - "All Genres" chip is always first in the list
 *   - Clicking a chip sets it as the active filter (turns solid blue)
 *   - Clicking the active chip again deselects it (goes back to "All Genres")
 *   - On mobile: the row scrolls horizontally if chips don't fit
 *
 * Props:
 *   genres         {string[]}  - Array of genre names from DiscoveryContext
 *   selectedGenre  {string}    - Currently active genre ("" = All Genres)
 *   onGenreSelect  {function}  - Called with the genre string when a chip is clicked
 */

import React from "react";
import "../styles/bookDiscovery.css";

/**
 * GenreFilter functional component.
 *
 * @param {object}    props
 * @param {string[]}  props.genres        - Available genre options
 * @param {string}    props.selectedGenre - Active genre filter value
 * @param {function}  props.onGenreSelect - Callback with selected genre
 */
function GenreFilter({ genres, selectedGenre, onGenreSelect }) {

  // Don't render anything if there are no genres yet (still loading)
  if (!genres || genres.length === 0) {
    return null;
  }

  return (
    <div className="genre-filter-section">

      <p className="genre-filter-label">Browse by Genre</p>

      {/* Horizontal scrollable row of chips */}
      <div className="genre-filter-chips" role="group" aria-label="Genre filter">

        {/* "All Genres" chip — always first, selected when selectedGenre is empty */}
        <button
          className={`genre-chip ${selectedGenre === "" ? "active" : ""}`}
          onClick={function () { onGenreSelect(""); }}
          aria-pressed={selectedGenre === ""}
        >
          All Genres
        </button>

        {/* One chip per genre returned from the backend */}
        {genres.map(function (genre) {
          const isActive = selectedGenre === genre;
          return (
            <button
              key={genre}
              className={`genre-chip ${isActive ? "active" : ""}`}
              onClick={function () {
                // Clicking the active chip again = deselect (go back to "All")
                onGenreSelect(isActive ? "" : genre);
              }}
              aria-pressed={isActive}
            >
              {genre}
            </button>
          );
        })}

      </div>
    </div>
  );
}

export default GenreFilter;
