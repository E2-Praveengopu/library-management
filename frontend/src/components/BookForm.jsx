/**
 * BookForm Component
 *
 * A modal form used for both ADDING a new book and EDITING an existing one.
 *
 * DUAL MODE:
 *   Add mode  → selectedBook is null  → empty fields, POST request
 *   Edit mode → selectedBook has data → pre-filled fields, PUT request
 *
 * The component detects the mode automatically by checking selectedBook
 * from BookContext. No extra props or flags needed.
 *
 * FIELDS:
 *   Title           (text, required)
 *   Author          (text, required)
 *   ISBN            (text, required, must be unique)
 *   Genre           (text with suggestion list, required)
 *   Total Copies    (number, min: 1, required)
 *   Available Copies(number, 0 to totalCopies, required)
 *   Cover Image     (file, optional — JPG/PNG/WEBP, max 5 MB)
 *
 * FILE UPLOAD STRATEGY:
 *   We use FormData (not JSON) because we need to send a file alongside text.
 *   multipart/form-data is the only HTTP format that supports file uploads.
 *   The browser sets the Content-Type header automatically when we pass FormData.
 *
 * USES CONTEXT:
 *   Reads selectedBook, handleAddBook, handleUpdateBook, closeForm
 *   from BookContext — no prop drilling.
 */

import React, { useState, useEffect } from "react";
import { useBookContext } from "../context/BookContext";
import "../styles/bookCatalog.css";

/**
 * Common book genres shown as autocomplete suggestions.
 * The user can still type any genre they want — datalist is just a hint.
 */
const GENRE_SUGGESTIONS = [
  "Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Mystery",
  "Thriller", "Horror", "Romance", "Biography", "History",
  "Self-Help", "Science", "Technology", "Philosophy", "Poetry",
  "Children", "Young Adult", "Graphic Novel", "Cookbook", "Travel",
];

/**
 * BookForm functional component.
 *
 * Displays inside a modal overlay. Handles form state locally (not in context)
 * because this data is only relevant while the form is open.
 */
function BookForm() {

  // Pull what we need from BookContext
  const {
    selectedBook,      // null in add mode, book object in edit mode
    handleAddBook,     // async function: POST new book
    handleUpdateBook,  // async function: PUT existing book
    closeForm,         // closes this modal
  } = useBookContext();

  // Is this an edit operation? (true when selectedBook is not null)
  const isEditing = selectedBook !== null;

  // ---------------------------------------------------------------------------
  // LOCAL FORM STATE
  // These are the values the user is typing into the inputs.
  // We initialise them from selectedBook (edit mode) or leave empty (add mode).
  // ---------------------------------------------------------------------------

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [genre, setGenre] = useState("");
  const [totalCopies, setTotalCopies] = useState(1);
  const [availableCopies, setAvailableCopies] = useState(1);

  /** The new image File object the user has selected (null if none chosen yet) */
  const [imageFile, setImageFile] = useState(null);

  /** Preview URL for the newly selected image (so we can show it before upload) */
  const [imagePreview, setImagePreview] = useState(null);

  /** Whether the form is currently submitting (disables the submit button) */
  const [loading, setLoading] = useState(false);

  /** Error message shown inside the form if the API call fails */
  const [error, setError] = useState("");

  /**
   * useEffect runs when the form mounts or when selectedBook changes.
   *
   * In edit mode: pre-fill all the input fields with the book's current values.
   * In add mode:  leave the fields empty (default values from useState above).
   */
  useEffect(function () {
    if (isEditing && selectedBook) {
      setTitle(selectedBook.title || "");
      setAuthor(selectedBook.author || "");
      setIsbn(selectedBook.isbn || "");
      setGenre(selectedBook.genre || "");
      setTotalCopies(selectedBook.totalCopies || 1);
      setAvailableCopies(selectedBook.availableCopies || 0);
      // Don't pre-fill the file input — user must select a new file to change it
      setImageFile(null);
      setImagePreview(null);
    }
  }, [selectedBook, isEditing]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Called when the user picks an image file.
   * Creates a temporary local URL (object URL) so we can show a preview
   * before it's actually uploaded to the server.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event
   */
  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);

    // URL.createObjectURL makes a temporary browser-side URL pointing to the file
    // This lets us show the image instantly without uploading it
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  /**
   * Handles the totalCopies field changing.
   * If the user reduces total below available, we auto-reduce available too
   * so the form never has an invalid state (available > total).
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleTotalCopiesChange(e) {
    const value = parseInt(e.target.value, 10) || 1;
    setTotalCopies(value);

    // Keep available ≤ total at all times
    if (availableCopies > value) {
      setAvailableCopies(value);
    }
  }

  /**
   * Handles the availableCopies field changing.
   * Clamps the value to the range [0, totalCopies].
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleAvailableCopiesChange(e) {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;

    // Clamp: available must be between 0 and totalCopies
    const clamped = Math.min(Math.max(0, value), totalCopies);
    setAvailableCopies(clamped);
  }

  /**
   * Called when the form is submitted (Save / Update button clicked).
   *
   * Steps:
   *   1. Basic client-side validation (required fields)
   *   2. Build a FormData object with all the fields + optional file
   *   3. Call handleAddBook or handleUpdateBook from context
   *   4. Close the modal on success; show error on failure
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submit event
   */
  async function handleSubmit(e) {
    // Prevent the default browser behaviour of reloading the page on form submit
    e.preventDefault();
    setError("");

    // --- Client-side validation ---
    if (!title.trim()) return setError("Title is required.");
    if (!author.trim()) return setError("Author is required.");
    if (!isbn.trim()) return setError("ISBN is required.");
    if (!genre.trim()) return setError("Genre is required.");
    if (totalCopies < 1) return setError("Total copies must be at least 1.");
    if (availableCopies < 0 || availableCopies > totalCopies) {
      return setError(`Available copies must be between 0 and ${totalCopies}.`);
    }

    // --- Build FormData ---
    // FormData is a special object that can hold both text fields and file data.
    // When we pass it to fetch(), the browser encodes everything as multipart/form-data.
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("author", author.trim());
    formData.append("isbn", isbn.trim());
    formData.append("genre", genre.trim());
    formData.append("totalCopies", totalCopies);
    formData.append("availableCopies", availableCopies);

    // Only append the image file if the user selected one
    if (imageFile) {
      // "coverImage" must match the field name Multer expects on the backend
      formData.append("coverImage", imageFile);
    }

    setLoading(true);

    try {
      if (isEditing) {
        await handleUpdateBook(selectedBook.id, formData);
      } else {
        await handleAddBook(formData);
      }

      // Success — close the modal (BookContext already refreshed the book list)
      closeForm();
    } catch (err) {
      // Server returned an error (e.g. duplicate ISBN, invalid token)
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Determine what image to show in the preview section:
  // 1. A newly selected local file (imagePreview is an object URL)
  // 2. The existing cover image from the server (selectedBook.coverImageUrl)
  // 3. Nothing (no preview shown)
  const previewSrc = imagePreview || (isEditing && selectedBook?.coverImageUrl) || null;

  return (
    /* Dark overlay — clicking outside the white card closes the form */
    <div
      className="modal-overlay"
      onClick={function (e) {
        if (e.target === e.currentTarget) {
          closeForm();
        }
      }}
    >
      <div className="book-form-card">

        {/* Form header: title + × close button */}
        <div className="book-form-header">
          <h2>{isEditing ? "Edit Book" : "Add New Book"}</h2>
          <button
            className="book-form-close"
            onClick={closeForm}
            type="button"
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        {/* The actual form */}
        <form className="book-form" onSubmit={handleSubmit} noValidate>

          {/* Error message if something went wrong */}
          {error && <div className="book-form-error">{error}</div>}

          {/* Title field */}
          <div className="book-form-group">
            <label className="book-form-label" htmlFor="book-title">
              Title <span className="required">*</span>
            </label>
            <input
              id="book-title"
              type="text"
              className="book-form-input"
              placeholder="e.g. The Great Gatsby"
              value={title}
              onChange={function (e) { setTitle(e.target.value); }}
              maxLength={255}
              autoComplete="off"
            />
          </div>

          {/* Author field */}
          <div className="book-form-group">
            <label className="book-form-label" htmlFor="book-author">
              Author <span className="required">*</span>
            </label>
            <input
              id="book-author"
              type="text"
              className="book-form-input"
              placeholder="e.g. F. Scott Fitzgerald"
              value={author}
              onChange={function (e) { setAuthor(e.target.value); }}
              maxLength={255}
              autoComplete="off"
            />
          </div>

          {/* ISBN field */}
          <div className="book-form-group">
            <label className="book-form-label" htmlFor="book-isbn">
              ISBN <span className="required">*</span>
            </label>
            <input
              id="book-isbn"
              type="text"
              className="book-form-input"
              placeholder="e.g. 978-0-7432-7356-5"
              value={isbn}
              onChange={function (e) { setIsbn(e.target.value); }}
              maxLength={20}
              autoComplete="off"
            />
            <span className="book-form-hint">Must be unique across all books.</span>
          </div>

          {/* Genre field — text input with a datalist for autocomplete suggestions */}
          <div className="book-form-group">
            <label className="book-form-label" htmlFor="book-genre">
              Genre / Category <span className="required">*</span>
            </label>
            <input
              id="book-genre"
              type="text"
              className="book-form-input"
              placeholder="e.g. Fiction, Science, History…"
              value={genre}
              onChange={function (e) { setGenre(e.target.value); }}
              maxLength={100}
              list="genre-suggestions"
              autoComplete="off"
            />
            {/*
              datalist provides autocomplete options for the input above.
              The browser shows a dropdown of matching options as the user types.
              The user can still type anything — it's not a strict dropdown.
            */}
            <datalist id="genre-suggestions">
              {GENRE_SUGGESTIONS.map(function (g) {
                return <option key={g} value={g} />;
              })}
            </datalist>
          </div>

          {/* Total Copies + Available Copies — side by side on tablet/desktop */}
          <div className="book-form-row">

            <div className="book-form-group">
              <label className="book-form-label" htmlFor="book-total-copies">
                Total Copies <span className="required">*</span>
              </label>
              <input
                id="book-total-copies"
                type="number"
                className="book-form-input"
                min="1"
                value={totalCopies}
                onChange={handleTotalCopiesChange}
              />
            </div>

            <div className="book-form-group">
              <label className="book-form-label" htmlFor="book-avail-copies">
                Available Copies <span className="required">*</span>
              </label>
              <input
                id="book-avail-copies"
                type="number"
                className="book-form-input"
                min="0"
                max={totalCopies}
                value={availableCopies}
                onChange={handleAvailableCopiesChange}
              />
            </div>

          </div>

          {/* Cover Image upload field */}
          <div className="book-form-group">
            <label className="book-form-label" htmlFor="book-cover">
              Cover Image
            </label>
            <input
              id="book-cover"
              type="file"
              className="book-form-file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
            />
            <span className="book-form-hint">
              JPG, PNG or WEBP — max 5 MB.
              {isEditing && !imageFile && selectedBook?.coverImage && " Current image kept unless you choose a new one."}
            </span>

            {/* Image preview — shows either new selection or existing cover */}
            {previewSrc && (
              <div className="book-form-image-preview">
                <img src={previewSrc} alt="Cover preview" />
              </div>
            )}
          </div>

        </form>

        {/* Footer with Cancel and Save/Update buttons */}
        <div className="book-form-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={closeForm}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading
              ? (isEditing ? "Updating…" : "Adding…")
              : (isEditing ? "Update Book" : "Add Book")}
          </button>
        </div>

      </div>
    </div>
  );
}

export default BookForm;
