/**
 * MEMBER CONTROLLER
 *
 * Admin-only operations for managing registered library members.
 *
 * ROUTES HANDLED:
 *   GET  /api/admin/members              → getAllMembers
 *   GET  /api/admin/members/:id          → getMemberById
 *   PUT  /api/admin/members/:id/status   → toggleMemberStatus
 *
 * KEY FEATURES:
 *   - getAllMembers: paginated list with search (name/email),
 *     status filter (all/active/inactive), active loan count per member
 *   - getMemberById: full profile — member info + active loans + borrow history
 *   - toggleMemberStatus: activate or deactivate a member account.
 *     Deactivated members cannot log in (enforced in authController).
 *     Admin accounts can never be deactivated through this endpoint.
 */

const { Op } = require("sequelize");
const User     = require("../models/User");
const Book     = require("../models/Book");
const Borrowing = require("../models/Borrowing");

/**
 * Builds a full URL for a book cover image.
 * @param {object} req
 * @param {string} filename
 * @returns {string|null}
 */
function buildCoverImageUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/books/${filename}`;
}

/**
 * Returns true if a borrowing is past its due date and not yet returned.
 * @param {object} b - Borrowing row
 * @returns {boolean}
 */
function isOverdue(b) {
  return b.status === "borrowed" && b.dueDate && new Date(b.dueDate) < new Date();
}


// =============================================================================
// GET ALL MEMBERS
// Route: GET /api/admin/members
// Query params:
//   ?page=1
//   ?limit=12
//   ?status=all|active|inactive
//   ?search=text  — matches name or email (case-insensitive)
// =============================================================================

/**
 * GET ALL MEMBERS
 *
 * Returns a paginated list of all members (role = "member") with:
 *   - Basic profile info (id, name, email, isActive, createdAt)
 *   - activeLoansCount: how many books they currently have borrowed
 *   - totalLoansCount:  lifetime total of all borrowings
 *
 * Supports live search and status filtering for the management UI.
 *
 * @param {object} req
 * @param {object} res
 */
const getAllMembers = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)   || 1;
    const limit  = parseInt(req.query.limit)  || 12;
    const offset = (page - 1) * limit;
    const status = req.query.status || "all"; // "all" | "active" | "inactive"
    const search = req.query.search || "";

    // ── WHERE clause ─────────────────────────────────────────────────────────
    const where = { role: "member" };

    if (status === "active")   where.isActive = true;
    if (status === "inactive") where.isActive = false;

    if (search) {
      where[Op.or] = [
        { name:  { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // ── Query ─────────────────────────────────────────────────────────────────
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "email", "isActive", "createdAt"],
      order:  [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // ── Enrich each member with loan counts ───────────────────────────────────
    // We fetch counts in one query per batch rather than N+1 per row.
    const memberIds = rows.map(function (u) { return u.id; });

    // Count active loans per member (status = "borrowed")
    const activeCounts = await Borrowing.findAll({
      where:      { userId: { [Op.in]: memberIds }, status: "borrowed" },
      attributes: ["userId"],
    });

    // Count total loans per member (all statuses)
    const totalCounts = await Borrowing.findAll({
      where:      { userId: { [Op.in]: memberIds } },
      attributes: ["userId"],
    });

    // Build lookup maps: { userId → count }
    const activeMap = {};
    const totalMap  = {};
    activeCounts.forEach(function (b) { activeMap[b.userId] = (activeMap[b.userId] || 0) + 1; });
    totalCounts.forEach(function (b)  { totalMap[b.userId]  = (totalMap[b.userId]  || 0) + 1; });

    // Assemble the final member list
    const members = rows.map(function (u) {
      return {
        id:               u.id,
        name:             u.name,
        email:            u.email,
        isActive:         u.isActive,
        joinedAt:         u.createdAt,
        activeLoansCount: activeMap[u.id]  || 0,
        totalLoansCount:  totalMap[u.id]   || 0,
      };
    });

    const totalPages = Math.ceil(count / limit);

    // ── Summary stats (always over the full unfiltered count) ─────────────────
    const [totalAll, totalActive] = await Promise.all([
      User.count({ where: { role: "member" } }),
      User.count({ where: { role: "member", isActive: true } }),
    ]);

    return res.status(200).json({
      message: "Members retrieved successfully.",
      pagination: {
        currentPage: page,
        totalPages,
        totalMembers: count,
        limit,
        hasNextPage:     page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats: {
        total:    totalAll,
        active:   totalActive,
        inactive: totalAll - totalActive,
      },
      members,
    });

  } catch (error) {
    console.error("getAllMembers error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve members.", error: error.message });
  }
};


// =============================================================================
// GET MEMBER BY ID
// Route: GET /api/admin/members/:id
// =============================================================================

/**
 * GET MEMBER BY ID
 *
 * Returns a single member's full profile including:
 *   - Profile fields (id, name, email, isActive, joinedAt)
 *   - Lifetime stats (totalLoans, activeLoans, returnedLoans, overdueLoans)
 *   - Active loans: array of current borrowings with book details
 *   - History: array of returned borrowings (most recent first, last 20)
 *
 * @param {object} req - req.params.id = member's user ID
 * @param {object} res
 */
const getMemberById = async (req, res) => {
  try {
    const memberId = req.params.id;

    // Find the member (must have role "member", not admin)
    const member = await User.findOne({
      where:      { id: memberId, role: "member" },
      attributes: ["id", "name", "email", "isActive", "createdAt"],
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    // Fetch all borrowings for this member with book details
    const allBorrowings = await Borrowing.findAll({
      where: { userId: memberId },
      include: [
        {
          model:      Book,
          as:         "book",
          attributes: ["id", "title", "author", "genre", "isbn", "coverImage"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Separate active and returned
    const activeLoans = [];
    const history     = [];

    allBorrowings.forEach(function (b) {
      const overdue = isOverdue(b);
      const formatted = {
        id:         b.id,
        status:     b.status,
        isOverdue:  overdue,
        dueDate:    b.dueDate,
        returnedAt: b.returnedAt,
        borrowedAt: b.createdAt,
        book: b.book
          ? {
              id:            b.book.id,
              title:         b.book.title,
              author:        b.book.author,
              genre:         b.book.genre,
              isbn:          b.book.isbn,
              coverImageUrl: buildCoverImageUrl(req, b.book.coverImage),
            }
          : null,
      };

      if (b.status === "borrowed") {
        activeLoans.push(formatted);
      } else {
        history.push(formatted);
      }
    });

    return res.status(200).json({
      message: "Member profile retrieved successfully.",
      member: {
        id:       member.id,
        name:     member.name,
        email:    member.email,
        isActive: member.isActive,
        joinedAt: member.createdAt,
        stats: {
          totalLoans:    allBorrowings.length,
          activeLoans:   activeLoans.length,
          returnedLoans: history.length,
          overdueLoans:  activeLoans.filter(function (b) { return b.isOverdue; }).length,
        },
      },
      activeLoans,
      history: history.slice(0, 20), // last 20 returned books
    });

  } catch (error) {
    console.error("getMemberById error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve member profile.", error: error.message });
  }
};


// =============================================================================
// TOGGLE MEMBER STATUS (Activate / Deactivate)
// Route: PUT /api/admin/members/:id/status
// Body: { isActive: boolean }
// =============================================================================

/**
 * TOGGLE MEMBER STATUS
 *
 * An admin can activate or deactivate any member's account.
 *
 * RULES:
 *   - Admin accounts cannot be deactivated through this endpoint
 *   - The request body must contain { isActive: true } or { isActive: false }
 *
 * EFFECT OF DEACTIVATION:
 *   - The member cannot log in (authController checks isActive on login)
 *   - Existing borrow records are preserved (for audit trail)
 *   - The member does not appear in the "issue book" dropdown
 *
 * @param {object} req - req.params.id = member's user ID, req.body.isActive = boolean
 * @param {object} res
 */
const toggleMemberStatus = async (req, res) => {
  try {
    const memberId = req.params.id;
    const { isActive } = req.body;

    // Validate input
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "Request body must include isActive: true or false." });
    }

    // Find the user
    const user = await User.findByPk(memberId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Prevent deactivating admin accounts
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deactivated." });
    }

    // Apply the status change
    await user.update({ isActive });

    const action = isActive ? "activated" : "deactivated";

    return res.status(200).json({
      message: `Member account has been ${action} successfully.`,
      member: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        isActive: user.isActive,
      },
    });

  } catch (error) {
    console.error("toggleMemberStatus error:", error.message);
    return res.status(500).json({ message: "Failed to update member status.", error: error.message });
  }
};


module.exports = {
  getAllMembers,
  getMemberById,
  toggleMemberStatus,
};
