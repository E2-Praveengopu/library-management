/**
 * SkeletonCard Component
 *
 * A placeholder card with a shimmer animation displayed while books are loading.
 *
 * WHY SKELETONS INSTEAD OF A SPINNER?
 *   A skeleton shows the exact shape of the content before it loads.
 *   This tells the user what kind of content is coming, preventing layout
 *   shifts and feeling much faster than a plain spinner.
 *
 *   The shimmer animation (a grey gradient moving left to right) signals
 *   that the content is actively being fetched.
 *
 * USAGE:
 *   Render N skeleton cards while loading=true, then swap with real BookCards.
 *   Usually 8 or 12 skeleton cards fill one full page of grid.
 *
 *   {loading
 *     ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
 *     : books.map(book => <MemberBookCard key={book.id} book={book} />)
 *   }
 *
 * No props needed — it always renders the same placeholder shape.
 */

import React from "react";
import "../styles/bookDiscovery.css";

/**
 * SkeletonCard functional component.
 * Renders a shimmering placeholder that matches the shape of a MemberBookCard.
 */
function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">

      {/* Placeholder for the cover image area */}
      <div className="skeleton-image-wrap">
        <div className="skeleton-image shimmer" />
      </div>

      {/* Placeholder for the card text body */}
      <div className="skeleton-body">

        {/* Title placeholder — full width */}
        <div className="skeleton-line full shimmer" />

        {/* Second title line (title can be 2 lines) — medium width */}
        <div className="skeleton-line medium shimmer" />

        {/* Author placeholder — short */}
        <div className="skeleton-line short shimmer" />

        {/* Genre badge placeholder */}
        <div className="skeleton-badge shimmer" style={{ marginBottom: "10px" }} />

        {/* CTA button placeholder */}
        <div className="skeleton-btn shimmer" />

      </div>
    </div>
  );
}

export default SkeletonCard;
