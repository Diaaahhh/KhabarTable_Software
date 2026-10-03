import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const router = express.Router();

// =========================================================
// MULTER CONFIGURATION
// =========================================================

const uploadDir = path.join(process.cwd(), "uploads", "branches");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const filename = `branch-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, JPEG, PNG and WEBP images are allowed."),
      );
    }

    cb(null, true);
  },
});

/*
  Get logged-in user information from cookie
*/
function getUserFromCookie(req) {
  if (!req.cookies) return null;

  for (const cookieValue of Object.values(req.cookies)) {
    try {
      const decodedValue = decodeURIComponent(cookieValue);
      const parsedValue = JSON.parse(decodedValue);

      if (
        parsedValue &&
        parsedValue.id !== undefined &&
        parsedValue.company_id !== undefined
      ) {
        return parsedValue;
      }
    } catch (error) {
      // Ignore cookies that are not JSON
    }
  }

  return null;
}

/*
  GET /api/branches

  Fetch only branch users:
  role = 4
*/
router.get("/", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const company_id = user.company_id;

    const [branches] = await db.query(
      `
      SELECT
        b.id,
        b.company_id,
        b.company_name AS branch_name,
        b.phone,
        b.email,
        b.address,
        b.logo,
        b.expiry_date,
        creator.email AS created_by,
        b.created_at,
        b.updated_at

      FROM users AS b

      LEFT JOIN users AS creator
        ON creator.id = b.created_by

      WHERE b.role = 4
        AND b.company_id = ?

      ORDER BY b.id DESC
      `,
      [company_id],
    );

    return res.status(200).json({
      success: true,
      branches,
    });
  } catch (error) {
    console.error("Fetch branches error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching branches.",
      error: error.message,
    });
  }
});

/*
  GET /api/branches/:branchId/permissions
*/
router.get("/:branchId/permissions", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const loggedInUserId = Number(user.id);
    const branchId = Number(req.params.branchId);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const [branchRows] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
        AND company_id = ?
        AND role = 4
      LIMIT 1
      `,
      [branchId, user.company_id],
    );

    if (branchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    const [menus] = await db.query(
      `
      SELECT
        um.id,
        um.parent_id,
        um.menu,
        um.icon,
        um.href
      FROM user_user_menu AS uum
      INNER JOIN user_menu AS um
        ON um.id = uum.user_menu_id
      WHERE uum.user_id = ?
      ORDER BY um.parent_id ASC, um.id ASC
      `,
      [loggedInUserId],
    );

    const [assignedRows] = await db.query(
      `
      SELECT user_menu_id
      FROM user_user_menu
      WHERE user_id = ?
      `,
      [branchId],
    );

    const selectedPermissionIds = assignedRows.map((row) =>
      Number(row.user_menu_id),
    );

    return res.status(200).json({
      success: true,
      branch_id: branchId,
      menus,
      selectedPermissionIds,
    });
  } catch (error) {
    console.error("Fetch branch permissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching branch permissions.",
      error: error.message,
    });
  }
});

/*
  POST /api/branches/:branchId/permissions
*/
router.post("/:branchId/permissions", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const branch_id = Number(req.params.branchId);
    const { menu_ids } = req.body;

    if (!Number.isInteger(branch_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (!Array.isArray(menu_ids)) {
      return res.status(400).json({
        success: false,
        message: "menu_ids must be an array.",
      });
    }

    const menuIds = [
      ...new Set(
        menu_ids
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    const [branchRows] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
        AND company_id = ?
        AND role = 4
      LIMIT 1
      `,
      [branch_id, user.company_id],
    );

    if (branchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    if (menuIds.length > 0) {
      const placeholders = menuIds.map(() => "?").join(",");

      const [menuRows] = await db.query(
        `
        SELECT id
        FROM user_menu
        WHERE id IN (${placeholders})
        `,
        menuIds,
      );

      const validMenuIds = menuRows.map((menu) => Number(menu.id));

      const invalidMenuIds = menuIds.filter(
        (id) => !validMenuIds.includes(id),
      );

      if (invalidMenuIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "One or more menu IDs are invalid.",
          invalid_menu_ids: invalidMenuIds,
        });
      }
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
        DELETE FROM user_user_menu
        WHERE user_id = ?
        `,
        [branch_id],
      );

      if (menuIds.length > 0) {
        const values = menuIds.map((menuId) => [branch_id, menuId]);

        await connection.query(
          `
          INSERT INTO user_user_menu
            (user_id, user_menu_id)
          VALUES ?
          `,
          [values],
        );
      }

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Branch permissions saved successfully.",
        branch_id,
        menu_ids: menuIds,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Save branch permissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while saving branch permissions.",
      error: error.message,
    });
  }
});

// =========================================================
// GET SINGLE BRANCH
// GET /api/branches/:branchId
// =========================================================

router.get("/:branchId", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const branchId = Number(req.params.branchId);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const [branchRows] = await db.query(
      `
      SELECT
        b.id,
        b.company_id,
        b.company_name AS branch_name,
        b.name,
        b.designation,
        od.name AS designation_name,
        b.phone,
        b.email,
        b.password,
        b.address,
        b.logo,
        b.expiry_date,
        b.created_at,
        b.updated_at
      FROM users AS b
      LEFT JOIN organization_designation AS od
        ON od.id = b.designation
      WHERE b.id = ?
        AND b.company_id = ?
        AND b.role = 4
      LIMIT 1
      `,
      [branchId, user.company_id],
    );

    if (branchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    return res.status(200).json({
      success: true,
      branch: branchRows[0],
    });
  } catch (error) {
    console.error("Fetch single branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching branch.",
      error: error.message,
    });
  }
});

// =========================================================
// UPDATE BRANCH
// PUT /api/branches/:branchId
// =========================================================

router.put("/:branchId", upload.single("logo"), async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const branchId = Number(req.params.branchId);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const {
      branchName,
      name,
      email,
      phone,
      password,
      designation,
      location,
    } = req.body;

    if (!branchName || !branchName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required.",
      });
    }

    const [branchRows] = await db.query(
      `
      SELECT id, logo, password
      FROM users
      WHERE id = ?
        AND company_id = ?
        AND role = 4
      LIMIT 1
      `,
      [branchId, user.company_id],
    );

    if (branchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    const existingBranch = branchRows[0];

    // ---------------------------------------------------------
    // Duplicate email check
    // ---------------------------------------------------------
    if (email && email.trim()) {
      const [emailRows] = await db.query(
        `
        SELECT id
        FROM users
        WHERE email = ?
          AND id != ?
        LIMIT 1
        `,
        [email.trim(), branchId],
      );

      if (emailRows.length > 0) {
        return res.status(409).json({
          success: false,
          code: "EMAIL_EXISTS",
          message: "This email is already used by another user.",
        });
      }
    }

    // ---------------------------------------------------------
    // Duplicate phone check
    // ---------------------------------------------------------
    if (phone && phone.trim()) {
      const [phoneRows] = await db.query(
        `
        SELECT id
        FROM users
        WHERE phone = ?
          AND id != ?
        LIMIT 1
        `,
        [phone.trim(), branchId],
      );

      if (phoneRows.length > 0) {
        return res.status(409).json({
          success: false,
          code: "PHONE_EXISTS",
          message: "This phone number is already used by another user.",
        });
      }
    }

    // ---------------------------------------------------------
    // Designation validation
    // ---------------------------------------------------------
    const designationId =
      designation !== undefined && designation !== null && designation !== ""
        ? Number(designation)
        : null;

    if (designationId !== null) {
      if (!Number.isInteger(designationId) || designationId < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid designation.",
        });
      }

      const [designationRows] = await db.query(
        `
        SELECT id
        FROM organization_designation
        WHERE id = ?
        LIMIT 1
        `,
        [designationId],
      );

      if (designationRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Selected designation does not exist.",
        });
      }
    }

    // ---------------------------------------------------------
    // Prepare update values
    // ---------------------------------------------------------
    const updateFields = [
      "company_name = ?",
      "name = ?",
      "phone = ?",
      "email = ?",
      "designation = ?",
      "address = ?",
    ];

    const updateValues = [
      branchName.trim(),
      name ? name.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      designationId,
      location ? location.trim() : null,
    ];

    // ---------------------------------------------------------
    // Password — only re-hash if the user typed a new one
    // ---------------------------------------------------------
    if (password && password.trim()) {
      const incoming = password.trim();

      // If the incoming value equals the stored hash, keep as-is
      // (the frontend pre-fills the hash)
      if (incoming === existingBranch.password) {
        // no change
      } else if (/^\$2[aby]\$/.test(incoming)) {
        // Already a bcrypt hash — keep it as-is
        updateFields.push("password = ?");
        updateValues.push(incoming);
      } else {
        // Plain password — hash it
        const hashed = await bcrypt.hash(incoming, 12);

        updateFields.push("password = ?");
        updateValues.push(hashed);
      }
    }

    // ---------------------------------------------------------
    // Logo
    // ---------------------------------------------------------
    if (req.file) {
      const logoPath = `/uploads/branches/${req.file.filename}`;

      updateFields.push("logo = ?");
      updateValues.push(logoPath);
    }

    updateValues.push(branchId);
    updateValues.push(user.company_id);

    // ---------------------------------------------------------
    // Update branch
    // ---------------------------------------------------------
    await db.query(
      `
      UPDATE users
      SET
        ${updateFields.join(", ")}
      WHERE id = ?
        AND company_id = ?
        AND role = 4
      `,
      updateValues,
    );

    // ---------------------------------------------------------
    // Get updated branch
    // ---------------------------------------------------------
    const [updatedRows] = await db.query(
      `
      SELECT
        b.id,
        b.company_id,
        b.company_name AS branch_name,
        b.name,
        b.designation,
        od.name AS designation_name,
        b.phone,
        b.email,
        b.password,
        b.address,
        b.logo,
        b.expiry_date,
        b.created_at,
        b.updated_at,
        creator.email AS created_by
      FROM users AS b
      LEFT JOIN users AS creator
        ON creator.id = b.created_by
      LEFT JOIN organization_designation AS od
        ON od.id = b.designation
      WHERE b.id = ?
        AND b.company_id = ?
        AND b.role = 4
      LIMIT 1
      `,
      [branchId, user.company_id],
    );

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully.",
      branch: updatedRows[0],
    });
  } catch (error) {
    console.error("Update branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating branch.",
      error: error.message,
    });
  }
});

// =========================================================
// DELETE BRANCH
// DELETE /api/branches/:branchId
// =========================================================

router.delete("/:branchId", async (req, res) => {
  let connection;

  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const branchId = Number(req.params.branchId);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const [branchRows] = await db.query(
      `
      SELECT
        id,
        company_id,
        company_name
      FROM users
      WHERE id = ?
        AND company_id = ?
        AND role = 4
      LIMIT 1
      `,
      [branchId, user.company_id],
    );

    if (branchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    const branch = branchRows[0];

    connection = await db.getConnection();

    await connection.beginTransaction();

    await connection.query(
      `
      DELETE FROM user_user_menu
      WHERE user_id = ?
      `,
      [branchId],
    );

    await connection.query(
      `
      DELETE FROM users
      WHERE id = ?
        AND company_id = ?
        AND role = 4
      `,
      [branchId, user.company_id],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully.",
      branch_id: branchId,
      branch_name: branch.company_name,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Delete branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting branch.",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;