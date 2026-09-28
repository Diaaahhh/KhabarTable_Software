import express from "express";
import db from "../db.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET COMPANY LIST
|--------------------------------------------------------------------------
|
| GET /api/companies
|
| Only role = 3 users are returned.
|
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();

    // Get all companies
    const [companies] = await connection.execute(`
      SELECT
        id,
        company_id,
        company_name,
        phone,
        email,
        restaurant_type,
        address,
        expiry_date,
        status,
        created_at
      FROM users
      WHERE role = 3
      ORDER BY id DESC
    `);

    // Create status map
    const statusMap = {
      1: "Active",
      2: "Inactive",
      3: "Expired",
      4: "Suspended",
    };
    // Get all restaurant categories
    const [categories] = await connection.execute(`
      SELECT
        id,
        res_category
      FROM restaurant_category
      ORDER BY id ASC
    `);

    // Create category map
    const categoryMap = new Map();

    categories.forEach((category) => {
      categoryMap.set(
        String(category.id),
        category.res_category
      );
    });

    // Convert restaurant type IDs to category names
const formattedCompanies = companies.map((company) => {
  let restaurantTypeIds = [];

  try {
    if (typeof company.restaurant_type === "string") {
      const parsed = JSON.parse(company.restaurant_type);

      if (Array.isArray(parsed)) {
        restaurantTypeIds = parsed;
      } else {
        restaurantTypeIds = [];
      }
    } else if (Array.isArray(company.restaurant_type)) {
      restaurantTypeIds = company.restaurant_type;
    }
  } catch (error) {
    console.error(
      "Invalid restaurant_type:",
      company.restaurant_type
    );

    restaurantTypeIds = [];
  }

  const restaurantTypes = restaurantTypeIds
    .map((id) => {
      const categoryId = String(id);

      return {
        id: Number(id),
        name: categoryMap.get(categoryId) || null,
      };
    })
    .filter((type) => type.name !== null);

  return {
    ...company,
    restaurant_types: restaurantTypes,
    status_name: statusMap[company.status] || "Unknown",
  };
});

    return res.status(200).json(formattedCompanies);

  } catch (error) {
    console.error("Failed to fetch company list:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company list.",
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * |--------------------------------------------------------------------------
 * | GET SINGLE COMPANY
 * |--------------------------------------------------------------------------
 * |
 * | GET /api/companies/:id
 * |
 * |--------------------------------------------------------------------------
 */

router.get("/:id", async (req, res) => {
  let connection;

  try {
    const companyUserId = Number(req.params.id);

    if (
      !Number.isInteger(companyUserId) ||
      companyUserId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `
        SELECT
          id,
          company_id,
          company_name,
          phone,
          email,
          restaurant_type,
          address,
          branchCount,
          branchCount_Remaining,
          logo,
          expiry_date
        FROM users
        WHERE id = ?
          AND role = 3
        LIMIT 1
      `,
      [companyUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch company:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * |--------------------------------------------------------------------------
 * | UPDATE COMPANY
 * |--------------------------------------------------------------------------
 * |
 * | PUT /api/companies/:id
 * |
 * |--------------------------------------------------------------------------
 */

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const companyUserId = Number(req.params.id);

    if (
      !Number.isInteger(companyUserId) ||
      companyUserId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    const {
      companyName,
      email,
      phone,
      address,
      restaurantType,
      branchCount,
      expiryDate,
    } = req.body;

    if (!companyName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Company name, email and phone are required.",
      });
    }

    connection = await db.getConnection();

    /**
     * ---------------------------------------------------------
     * Find company
     * ---------------------------------------------------------
     */

    const [companyRows] = await connection.execute(
      `
        SELECT
          id,
          company_id,
          branchCount,
          branchCount_Remaining
        FROM users
        WHERE id = ?
          AND role = 3
        LIMIT 1
      `,
      [companyUserId]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    const company = companyRows[0];

    /**
     * ---------------------------------------------------------
     * Check duplicate email
     * ---------------------------------------------------------
     */

    const [emailRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE email = ?
          AND id != ?
        LIMIT 1
      `,
      [email, companyUserId]
    );

    if (emailRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This email is already used by another company.",
      });
    }

    /**
     * ---------------------------------------------------------
     * Check duplicate phone
     * ---------------------------------------------------------
     */

    const [phoneRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE phone = ?
          AND id != ?
        LIMIT 1
      `,
      [phone, companyUserId]
    );

    if (phoneRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already used by another company.",
      });
    }

    /**
     * ---------------------------------------------------------
     * Restaurant type
     * ---------------------------------------------------------
     */

    let restaurantTypeValue = restaurantType;

    if (Array.isArray(restaurantType)) {
      restaurantTypeValue = JSON.stringify(restaurantType);
    }

    /**
     * ---------------------------------------------------------
     * Branch count
     * ---------------------------------------------------------
     */

    let newBranchCount = Number(branchCount);

    if (
      !Number.isInteger(newBranchCount) ||
      newBranchCount < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch count.",
      });
    }

    /**
     * ---------------------------------------------------------
     * Calculate remaining branches
     *
     * Existing used branches:
     *
     * branchCount - branchCount_Remaining
     * ---------------------------------------------------------
     */

    const usedBranches =
      Number(company.branchCount || 0) -
      Number(company.branchCount_Remaining || 0);

    if (newBranchCount < usedBranches) {
      return res.status(400).json({
        success: false,
        message: `Branch count cannot be less than the ${usedBranches} branch(es) already registered.`,
      });
    }

    const newRemainingBranches =
      newBranchCount - usedBranches;

    /**
     * ---------------------------------------------------------
     * Update company
     * ---------------------------------------------------------
     */

    await connection.execute(
      `
        UPDATE users
        SET
          company_name = ?,
          email = ?,
          phone = ?,
          address = ?,
          restaurant_type = ?,
          branchCount = ?,
          branchCount_Remaining = ?,
          expiry_date = ?,
          updated_at = NOW()
        WHERE id = ?
          AND role = 3
      `,
      [
        companyName,
        email,
        phone,
        address || null,
        restaurantTypeValue || null,
        newBranchCount,
        newRemainingBranches,
        expiryDate || null,
        companyUserId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Company updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update company:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/*
|--------------------------------------------------------------------------
| DELETE COMPANY
|--------------------------------------------------------------------------
|
| DELETE /api/companies/:id
|
|--------------------------------------------------------------------------
*/

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const companyUserId = Number(req.params.id);

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(companyUserId) ||
      companyUserId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    connection = await db.getConnection();

    /*
    |--------------------------------------------------------------------------
    | Find company
    |--------------------------------------------------------------------------
    */

    const [companyRows] = await connection.execute(
      `
        SELECT
          id,
          company_id,
          company_name
        FROM users
        WHERE id = ?
          AND role = 3
        LIMIT 1
      `,
      [companyUserId]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    const company = companyRows[0];

    /*
    |--------------------------------------------------------------------------
    | Delete company
    |--------------------------------------------------------------------------
    */

    await connection.execute(
      `
        DELETE FROM users
        WHERE id = ?
          AND role = 3
      `,
      [companyUserId]
    );

    return res.status(200).json({
      success: true,
      message: "Company deleted successfully.",
      data: {
        id: company.id,
        companyId: company.company_id,
        companyName: company.company_name,
      },
    });
  } catch (error) {
    console.error("Failed to delete company:", error);

    /*
    |--------------------------------------------------------------------------
    | Foreign Key Constraint
    |--------------------------------------------------------------------------
    */

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message:
          "This company cannot be deleted because related records exist.",
      });
    }

    if (error.code === "ER_ROW_IS_REFERENCED") {
      return res.status(409).json({
        success: false,
        message:
          "This company cannot be deleted because related records exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete company.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;