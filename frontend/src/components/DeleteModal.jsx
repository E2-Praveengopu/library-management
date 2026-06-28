/**
 * DeleteModal Component
 *
 * A confirmation dialog that appears before a book is permanently deleted.
 *
 * WHY HAVE A CONFIRMATION STEP?
 *   Deletion is irreversible — the backend removes both the database record
 *   AND the cover image file from disk. Showing this dialog prevents accidental
 *   clicks from destroying data the user didn't mean to delete.
 *
 * WHAT IT SHOWS:
 *   ⚠️
 *   Delete Book?
 *   "The Great Gatsby" will be permanently removed from the library.
 *   This action cannot be undone.
 *   [Cancel]  [Delete Book]
 *
 * HOW IT WORKS:
 *   1. Parent opens this modal by calling openDeleteModal(book) from BookContext
 *   2. User clicks "Delete Book" → we call handleDeleteBook(id) from context
 *   3. On success, the modal closes automatically (parent clears bookToDelete)
 *   4. User clicks "Cancel" → we call closeDeleteModal() from context
 *
 * Uses BookContext directly — no props needed except what comes from the shared store.
 */

import React, { useState } from "react";
import { useBookContext } from "../context/BookContext";
import "../styles/bookCatalog.css";

/**
 * DeleteModal functional component.
 *
 * Reads the book to delete from context and sends the delete request
 * when the user confirms. Shows a loading state during the API call.
 */
function DeleteModal() {

  // Pull everything we need from the shared BookContext
  const {
    bookToDelete,        // the book object the user wants to delete
    handleDeleteBook,    // async function that calls the DELETE API
    closeDeleteModal,    // function that hides this modal
  } = useBookContext();

  // Local loading and error states — these only matter while this modal is open
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Called when the user clicks "Delete Book".
   * Sends the DELETE request and closes the modal on success.
   */
  async function handleConfirm() {
    setLoading(true);
    setError("");

    try {
      await handleDeleteBook(bookToDelete.id);
      // handleDeleteBook already refreshes the book list via BookContext
      // Just close the modal now
      closeDeleteModal();
    } catch (err) {
      // Show the error message inside the modal instead of closing it
      setError(err.message || "Failed to delete book. Please try again.");
      setLoading(false);
    }
  }

  // Safety guard: if there is no book selected, render nothing
  // (This shouldn't happen in practice but prevents crashes)
  if (!bookToDelete) {
    return null;
  }

  return (
    /* Clicking the dark overlay also cancels the delete (UX convenience) */
    <div
      className="modal-overlay"
      onClick={function (e) {
        // Only close if the user clicked the dark background itself,
        // not something inside the white modal card
        if (e.target === e.currentTarget) {
          closeDeleteModal();
        }
      }}
    >
      <div className="delete-modal-card">

        {/* Warning emoji at the top for quick visual recognition */}
        <span className="delete-modal-icon" role="img" aria-label="Warning">⚠️</span>

        <h2>Delete Book?</h2>

        <p>
          <span className="delete-modal-book-name">
            "{bookToDelete.title}"
          </span>{" "}
          will be permanently removed from the library.
        </p>

        <p className="delete-modal-warning">
          This action cannot be undone.
        </p>

        {/* Error message if the delete request failed */}
        {error && (
          <div className="catalog-error" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div className="delete-modal-actions">

          {/* Cancel — closes without doing anything */}
          <button
            className="btn-cancel"
            onClick={closeDeleteModal}
            disabled={loading}
          >
            Cancel
          </button>

          {/* Confirm delete — triggers the API call */}
          <button
            className="btn-delete-confirm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete Book"}
          </button>

        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
