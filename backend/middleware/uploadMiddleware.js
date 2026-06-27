const multer = require("multer");
const path = require("path");

/**
 * UPLOAD MIDDLEWARE
 *
 * This file sets up "multer" — a package that lets Express handle file uploads.
 *
 * WHAT IS MULTER?
 * When a user sends a file through a form (like a cover image),
 * the browser sends it as "multipart/form-data" — a special format
 * that includes both text fields AND binary file data together.
 *
 * Express cannot read files from this format on its own.
 * Multer reads the file, saves it to the server's hard drive,
 * and then puts the file information into req.file so your controller can use it.
 *
 * WHAT THIS FILE CONFIGURES:
 *   1. Where to save the file (the "uploads/books/" folder)
 *   2. What to name the saved file (a unique name using a timestamp)
 *   3. Which file types are allowed (only images: jpg, png, webp)
 *   4. Maximum file size allowed (5 MB)
 *
 * AFTER MULTER RUNS, the controller receives:
 *   req.file.filename  — the name of the saved file  (e.g. "book-1712345678.jpg")
 *   req.file.path      — where the file is on disk    (e.g. "uploads/books/book-1712345678.jpg")
 *   req.file.size      — how big the file is in bytes  (e.g. 204800 = 200 KB)
 *   req.file.mimetype  — the file type                 (e.g. "image/jpeg")
 *
 * If no file is uploaded, req.file will be undefined (null-like).
 */

// ─── PART 1: STORAGE SETTINGS ─────────────────────────────────────────────────
//
// "diskStorage" tells multer to save the file to the hard drive.
// (The alternative "memoryStorage" keeps it in RAM only — not what we want here.)

const storage = multer.diskStorage({

  /**
   * destination — tells multer WHICH FOLDER to save the file in.
   *
   * We always save cover images to "uploads/books/".
   * This folder is created automatically when the server starts (in server.js).
   *
   * The callback works like this:
   *   callback(error, folderPath)
   *   - Pass null as the first argument (no error)
   *   - Pass the folder path as the second argument
   */
  destination: function (req, file, callback) {
    callback(null, "uploads/books/");
  },

  /**
   * filename — tells multer WHAT TO NAME the saved file.
   *
   * We do NOT use the original file name (like "my-book-photo.jpg") because:
   *   - Two different admins might upload files with the same name
   *   - Original names can have spaces or special characters that cause problems
   *
   * Instead, we generate a UNIQUE name using:
   *   "book-" + current time in milliseconds + a random number + the file extension
   *
   * Example result: "book-1712345678901-548293847.jpg"
   *
   * Date.now() returns the current time as a number (milliseconds since Jan 1, 1970).
   * This number is always different, so the filename is always unique.
   */
  filename: function (req, file, callback) {
    // path.extname() gets the extension from the original filename
    // For "cat.jpg" it returns ".jpg"
    // For "photo.PNG" it returns ".PNG"
    const fileExtension = path.extname(file.originalname);

    // Build the unique filename
    const timestamp = Date.now();
    const randomNumber = Math.round(Math.random() * 1000000000);
    const uniqueFilename = "book-" + timestamp + "-" + randomNumber + fileExtension;

    callback(null, uniqueFilename);
  },

});

// ─── PART 2: FILE TYPE FILTER ─────────────────────────────────────────────────
//
// This function runs BEFORE the file is saved.
// It checks whether the uploaded file is an image.
// If it is NOT an image, we reject it.

/**
 * fileFilter — decides whether to ACCEPT or REJECT an uploaded file.
 *
 * HOW MIME TYPES WORK:
 * Every file has a "MIME type" — a label that describes what kind of file it is.
 * The browser sends this label when it uploads a file.
 *
 * Common MIME types:
 *   "image/jpeg"       → .jpg or .jpeg files
 *   "image/png"        → .png files
 *   "image/webp"       → .webp files
 *   "application/pdf"  → .pdf files   (we REJECT these)
 *   "text/plain"       → .txt files   (we REJECT these)
 *
 * The callback works like this:
 *   callback(error, shouldAccept)
 *   - Pass null and true  → accept the file
 *   - Pass error and false → reject the file
 */
function fileFilter(req, file, callback) {

  // These are the only MIME types we will accept
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  // Check if the uploaded file's MIME type is in our allowed list
  const fileIsAllowed = allowedTypes.includes(file.mimetype);

  if (fileIsAllowed) {
    // The file is an image — allow multer to save it
    callback(null, true);
  } else {
    // The file is NOT an image — reject it with an error message
    const errorMessage = "Only image files are allowed (JPG, PNG, or WEBP).";
    callback(new Error(errorMessage), false);
  }

}

// ─── PART 3: PUT IT ALL TOGETHER ─────────────────────────────────────────────
//
// Combine the storage settings, file filter, and size limit into one multer object.

const upload = multer({
  storage:    storage,     // use our disk storage settings from Part 1
  fileFilter: fileFilter,  // use our image-only filter from Part 2
  limits: {
    // Maximum file size: 5 MB
    // Calculation: 5 (MB) × 1024 (KB per MB) × 1024 (bytes per KB) = 5,242,880 bytes
    fileSize: 5 * 1024 * 1024,
  },
});

// Export the upload object so routes can use it.
//
// In routes, you'll use it like this:
//   upload.single("coverImage")
//
// "coverImage" is the field name you send in the form.
// upload.single() means "accept only ONE file from this field".
module.exports = upload;
