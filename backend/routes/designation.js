import express from "express";
import db from "../db.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| FORMAT DESIGNATION NAME
|--------------------------------------------------------------------------
| Same structure as formatText.ts:
|
| chief chef  -> Chief Chef
| CASHIER     -> Cashier
| assistant chef -> Assistant Chef
|
*/

const capitalizeWords = (value) => {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/*
|--------------------------------------------------------------------------
| GET /api/designations
|--------------------------------------------------------------------------
| Fetch paginated designations
|
| Example:
| GET /api/designations?page=1&limit=10
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 10;

    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 10;
    }

    // Prevent unnecessarily large requests
    if (limit > 100) {
      limit = 100;
    }

    const offset = (page - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | Get total number of designations
    |--------------------------------------------------------------------------
    */

    const [countRows] = await db.execute(`
      SELECT COUNT(*) AS total
      FROM organization_designation
    `);

    const total = Number(countRows[0].total);

    /*
    |--------------------------------------------------------------------------
    | Get paginated designations
    |--------------------------------------------------------------------------
    */

    const [rows] = await db.execute(
      `
        SELECT
          id,
          code,
          name,
          description
        FROM organization_designation
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `,
      [limit, offset],
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching designations:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch designations.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/designations/check-name
|--------------------------------------------------------------------------
| Check designation name instantly.
|
| Frontend waits 2 seconds after typing stops before calling this route.
|
| Example:
| GET /api/designations/check-name?name=Chief%20Chef
|
| During edit:
| GET /api/designations/check-name?name=Chief%20Chef&excludeId=3
|--------------------------------------------------------------------------
*/

router.get("/check-name", async (req, res) => {
  try {
    const rawName = req.query.name;

    if (
      rawName === undefined ||
      rawName === null ||
      typeof rawName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Designation name is required.",
      });
    }

    const name = capitalizeWords(rawName.trim());

    if (!name) {
      return res.status(200).json({
        success: true,
        exists: false,
      });
    }

    const excludeId =
      req.query.excludeId !== undefined
        ? Number(req.query.excludeId)
        : null;

    let sql = `
      SELECT id
      FROM organization_designation
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    `;

    const params = [name];

    /*
    |--------------------------------------------------------------------------
    | When editing, exclude the current designation itself.
    |--------------------------------------------------------------------------
    */

    if (excludeId !== null) {
      if (!Number.isInteger(excludeId) || excludeId < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid designation ID.",
        });
      }

      sql += `
        AND id != ?
      `;

      params.push(excludeId);
    }

    sql += `
      LIMIT 1
    `;

    const [rows] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      exists: rows.length > 0,
    });
  } catch (error) {
    console.error("Error checking designation name:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check designation name.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/designations
|--------------------------------------------------------------------------
| Create a new designation
|
| Request body:
|
| {
|   "name": "Chief Chef",
|   "description": "Responsible for kitchen operations."
| }
|
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    const { name: rawName, description: rawDescription } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate name
    |--------------------------------------------------------------------------
    */

    if (
      !rawName ||
      typeof rawName !== "string" ||
      !rawName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Designation name is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Format name
    |--------------------------------------------------------------------------
    */

    const name = capitalizeWords(rawName.trim());

    /*
    |--------------------------------------------------------------------------
    | Format description
    |--------------------------------------------------------------------------
    */

    const description =
      typeof rawDescription === "string"
        ? rawDescription.trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | Check duplicate designation name
    |--------------------------------------------------------------------------
    */

    const [duplicateRows] = await db.execute(
      `
        SELECT id
        FROM organization_designation
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [name],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This designation name already exists.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate designation code
    |
    | d001
    | d002
    | d003
    | ...
    |--------------------------------------------------------------------------
    */

    const [lastCodeRows] = await db.execute(`
      SELECT code
      FROM organization_designation
      WHERE code REGEXP '^d[0-9]+$'
      ORDER BY CAST(SUBSTRING(code, 2) AS UNSIGNED) DESC
      LIMIT 1
    `);

    let nextNumber = 1;

    if (lastCodeRows.length > 0) {
      const lastCode = lastCodeRows[0].code;

      const lastNumber = Number(
        String(lastCode).substring(1),
      );

      if (Number.isInteger(lastNumber) && lastNumber >= 1) {
        nextNumber = lastNumber + 1;
      }
    }

    const code = `d${String(nextNumber).padStart(3, "0")}`;

    /*
    |--------------------------------------------------------------------------
    | Insert designation
    |--------------------------------------------------------------------------
    */

    const [result] = await db.execute(
      `
        INSERT INTO organization_designation
        (
          code,
          name,
          description
          
        )
        VALUES (?, ?, ?)
      `,
      [code, name, description],
    );

    /*
    |--------------------------------------------------------------------------
    | Return created designation
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message: "Designation created successfully.",
      data: {
        id: result.insertId,
        code,
        name,
        description,
        status: "active",
      },
    });
  } catch (error) {
    console.error("Error creating designation:", error);

    /*
    |--------------------------------------------------------------------------
    | Handle duplicate database constraint
    |--------------------------------------------------------------------------
    */

    if (
      error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message: "This designation already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create designation.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PUT /api/designations/:id
|--------------------------------------------------------------------------
| Update an existing designation
|
| Request body:
|
| {
|   "name": "Chief Chef",
|   "description": "Updated description."
| }
|--------------------------------------------------------------------------
*/

router.put("/:id", async (req, res) => {
  try {
    const designationId = Number(req.params.id);

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(designationId) ||
      designationId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid designation ID is required.",
      });
    }

    const { name: rawName, description: rawDescription } =
      req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate name
    |--------------------------------------------------------------------------
    */

    if (
      !rawName ||
      typeof rawName !== "string" ||
      !rawName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Designation name is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Format values
    |--------------------------------------------------------------------------
    */

    const name = capitalizeWords(rawName.trim());

    const description =
      typeof rawDescription === "string"
        ? rawDescription.trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | Check if designation exists
    |--------------------------------------------------------------------------
    */

    const [existingRows] = await db.execute(
      `
        SELECT
          id,
          code,
          name,
          description
        FROM organization_designation
        WHERE id = ?
        LIMIT 1
      `,
      [designationId],
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Designation not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check duplicate name
    |
    | Exclude the current designation.
    |--------------------------------------------------------------------------
    */

    const [duplicateRows] = await db.execute(
      `
        SELECT id
        FROM organization_designation
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
          AND id != ?
        LIMIT 1
      `,
      [name, designationId],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This designation name already exists.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update designation
    |--------------------------------------------------------------------------
    |
    | Code is NOT changed during edit.
    |
    */

    await db.execute(
      `
        UPDATE organization_designation
        SET
          name = ?,
          description = ?
        WHERE id = ?
      `,
      [name, description, designationId],
    );

    /*
    |--------------------------------------------------------------------------
    | Return updated data
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully.",
      data: {
        id: designationId,
        code: existingRows[0].code,
        name,
        description,
        status: existingRows[0].status,
      },
    });
  } catch (error) {
    console.error("Error updating designation:", error);

    if (
      error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message: "This designation already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update designation.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE /api/designations/:id
|--------------------------------------------------------------------------
| Delete an existing designation
|--------------------------------------------------------------------------
*/

router.delete("/:id", async (req, res) => {
  try {
    const designationId = Number(req.params.id);

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(designationId) ||
      designationId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid designation ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check if designation exists
    |--------------------------------------------------------------------------
    */

    const [existingRows] = await db.execute(
      `
        SELECT
          id,
          code,
          name
        FROM organization_designation
        WHERE id = ?
        LIMIT 1
      `,
      [designationId],
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Designation not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete designation
    |--------------------------------------------------------------------------
    */

    await db.execute(
      `
        DELETE FROM organization_designation
        WHERE id = ?
      `,
      [designationId],
    );

    /*
    |--------------------------------------------------------------------------
    | Success response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Designation deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting designation:", error);

    /*
    |--------------------------------------------------------------------------
    | If employees_employee.designation_id has a foreign key
    | with ON DELETE SET NULL, the employee references will
    | automatically become NULL.
    |--------------------------------------------------------------------------
    */

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This designation is currently being used and cannot be deleted.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete designation.",
    });
  }
});

export default router;