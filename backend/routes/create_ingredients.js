import express from "express";
import db from "../db.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET UNITS
|--------------------------------------------------------------------------
| GET /api/menu-ingredients/units
|
| Fetch all units for the Ingredient form dropdown.
|--------------------------------------------------------------------------
*/

router.get("/units", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
          id,
          unit_name
        FROM unit
        ORDER BY unit_name ASC
      `
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to fetch units:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch units.",
    });
  }
});


/*
|--------------------------------------------------------------------------
| GET ALL INGREDIENTS
|--------------------------------------------------------------------------
| GET /api/menu-ingredients
|
| Fetch ingredients together with their unit name.
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
          mi.id,
          mi.ingredient_name,
          mi.unit_id,
          u.unit_name,
          mi.cost_per_unit
        FROM menu_ingredients mi
        INNER JOIN unit u
          ON u.id = mi.unit_id
        ORDER BY mi.id DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to fetch ingredients:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch ingredients.",
    });
  }
});


/*
|--------------------------------------------------------------------------
| CREATE INGREDIENT
|--------------------------------------------------------------------------
| POST /api/menu-ingredients
|
| Body:
| {
|   ingredient_name: "Rice",
|   unit_id: 1,
|   cost_per_unit: 85.50
| }
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    const {
      ingredient_name,
      unit_id,
      cost_per_unit,
    } = req.body;

    // =========================================================
    // VALIDATION
    // =========================================================

    if (
      !ingredient_name ||
      String(ingredient_name).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Ingredient name is required.",
      });
    }

    const cleanIngredientName =
      String(ingredient_name).trim();

    const numericUnitId = Number(unit_id);
    const numericCost = Number(cost_per_unit);

    if (
      !Number.isInteger(numericUnitId) ||
      numericUnitId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid unit.",
      });
    }

    if (
      cost_per_unit === undefined ||
      cost_per_unit === null ||
      cost_per_unit === "" ||
      !Number.isFinite(numericCost) ||
      numericCost < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid cost per unit.",
      });
    }

    // =========================================================
    // CHECK UNIT EXISTS
    // =========================================================

    const [unitRows] = await db.execute(
      `
        SELECT id
        FROM unit
        WHERE id = ?
        LIMIT 1
      `,
      [numericUnitId]
    );

    if (unitRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected unit does not exist.",
      });
    }

    // =========================================================
    // CHECK DUPLICATE INGREDIENT
    // =========================================================

    const [duplicateRows] = await db.execute(
      `
        SELECT id
        FROM menu_ingredients
        WHERE LOWER(TRIM(ingredient_name)) = LOWER(?)
        LIMIT 1
      `,
      [cleanIngredientName]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This ingredient already exists.",
      });
    }

    // =========================================================
    // INSERT INGREDIENT
    // =========================================================

    const [result] = await db.execute(
      `
        INSERT INTO menu_ingredients (
          ingredient_name,
          unit_id,
          cost_per_unit
        )
        VALUES (?, ?, ?)
      `,
      [
        cleanIngredientName,
        numericUnitId,
        Number(numericCost.toFixed(2)),
      ]
    );

    // =========================================================
    // SUCCESS
    // =========================================================

    return res.status(201).json({
      success: true,
      message: "Ingredient created successfully.",
      data: {
        id: result.insertId,
        ingredient_name: cleanIngredientName,
        unit_id: numericUnitId,
        cost_per_unit: Number(numericCost.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Create ingredient error:", error);

    // MySQL duplicate entry
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This ingredient already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create ingredient.",
    });
  }
});


/*
|--------------------------------------------------------------------------
| UPDATE INGREDIENT
|--------------------------------------------------------------------------
| PUT /api/menu-ingredients/:id
|
| Body:
| {
|   ingredient_name: "Rice",
|   unit_id: 1,
|   cost_per_unit: 90.00
| }
|--------------------------------------------------------------------------
*/

router.put("/:id", async (req, res) => {
  try {
    const ingredientId = Number(req.params.id);

    if (
      !Number.isInteger(ingredientId) ||
      ingredientId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ingredient ID.",
      });
    }

    const {
      ingredient_name,
      unit_id,
      cost_per_unit,
    } = req.body;

    // =========================================================
    // VALIDATION
    // =========================================================

    if (
      !ingredient_name ||
      String(ingredient_name).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Ingredient name is required.",
      });
    }

    const cleanIngredientName =
      String(ingredient_name).trim();

    const numericUnitId = Number(unit_id);
    const numericCost = Number(cost_per_unit);

    if (
      !Number.isInteger(numericUnitId) ||
      numericUnitId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid unit.",
      });
    }

    if (
      cost_per_unit === undefined ||
      cost_per_unit === null ||
      cost_per_unit === "" ||
      !Number.isFinite(numericCost) ||
      numericCost < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid cost per unit.",
      });
    }

    // =========================================================
    // CHECK INGREDIENT EXISTS
    // =========================================================

    const [ingredientRows] = await db.execute(
      `
        SELECT id
        FROM menu_ingredients
        WHERE id = ?
        LIMIT 1
      `,
      [ingredientId]
    );

    if (ingredientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ingredient not found.",
      });
    }

    // =========================================================
    // CHECK UNIT EXISTS
    // =========================================================

    const [unitRows] = await db.execute(
      `
        SELECT id
        FROM unit
        WHERE id = ?
        LIMIT 1
      `,
      [numericUnitId]
    );

    if (unitRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected unit does not exist.",
      });
    }

    // =========================================================
    // CHECK DUPLICATE INGREDIENT
    // =========================================================

    const [duplicateRows] = await db.execute(
      `
        SELECT id
        FROM menu_ingredients
        WHERE LOWER(TRIM(ingredient_name)) = LOWER(?)
          AND id <> ?
        LIMIT 1
      `,
      [
        cleanIngredientName,
        ingredientId,
      ]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Another ingredient with this name already exists.",
      });
    }

    // =========================================================
    // UPDATE INGREDIENT
    // =========================================================

    const [result] = await db.execute(
      `
        UPDATE menu_ingredients
        SET
          ingredient_name = ?,
          unit_id = ?,
          cost_per_unit = ?
        WHERE id = ?
      `,
      [
        cleanIngredientName,
        numericUnitId,
        Number(numericCost.toFixed(2)),
        ingredientId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Ingredient not found.",
      });
    }

    // =========================================================
    // SUCCESS
    // =========================================================

    return res.status(200).json({
      success: true,
      message: "Ingredient updated successfully.",
      data: {
        id: ingredientId,
        ingredient_name: cleanIngredientName,
        unit_id: numericUnitId,
        cost_per_unit: Number(numericCost.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Update ingredient error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This ingredient already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update ingredient.",
    });
  }
});


/*
|--------------------------------------------------------------------------
| DELETE INGREDIENT
|--------------------------------------------------------------------------
| DELETE /api/menu-ingredients/:id
|--------------------------------------------------------------------------
*/

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const ingredientId = Number(req.params.id);

    if (
      !Number.isInteger(ingredientId) ||
      ingredientId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ingredient ID.",
      });
    }

    // =========================================================
    // GET DATABASE CONNECTION
    // =========================================================

    connection = await db.getConnection();

    await connection.beginTransaction();

    // =========================================================
    // CHECK INGREDIENT EXISTS
    // =========================================================

    const [ingredientRows] = await connection.execute(
      `
        SELECT
          id,
          ingredient_name
        FROM menu_ingredients
        WHERE id = ?
        LIMIT 1
      `,
      [ingredientId]
    );

    if (ingredientRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Ingredient not found.",
      });
    }

    // =========================================================
    // CHECK WHETHER INGREDIENT IS USED
    // IN A SUBCATEGORY
    // =========================================================

    const [usageRows] = await connection.execute(
      `
        SELECT
          COUNT(*) AS usage_count
        FROM menu_subcategory_ingredients
        WHERE ingredient_id = ?
      `,
      [ingredientId]
    );

    const usageCount =
      Number(usageRows[0]?.usage_count) || 0;

    if (usageCount > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        code: "INGREDIENT_IN_USE",
        message:
          "This ingredient cannot be deleted because it is already used in a menu subcategory.",
      });
    }

    // =========================================================
    // DELETE INGREDIENT
    // =========================================================

    await connection.execute(
      `
        DELETE FROM menu_ingredients
        WHERE id = ?
      `,
      [ingredientId]
    );

    // =========================================================
    // COMMIT
    // =========================================================

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Ingredient deleted successfully.",
    });
  } catch (error) {
    console.error("Delete ingredient error:", error);

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback failed:",
          rollbackError
        );
      }
    }

    // Foreign key protection
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This ingredient cannot be deleted because it is being used elsewhere.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete ingredient.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


export default router;