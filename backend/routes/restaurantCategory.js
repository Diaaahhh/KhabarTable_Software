import express from "express";
import db from "../db.js";

const router = express.Router();

// ============================================================
// GET RESTAURANT CATEGORIES
// ============================================================

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT id, res_category
        FROM restaurant_category
        ORDER BY id ASC
      `
    );

    return res.status(200).json({
      message: "Restaurant categories fetched successfully.",
      categories: rows,
    });
  } catch (error) {
    console.error("Get restaurant categories error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

// ============================================================
// CREATE RESTAURANT CATEGORY
// ============================================================

router.post("/create-rest-type", async (req, res) => {
  try {
    const { res_category } = req.body;

    // ========================================================
    // VALIDATE
    // ========================================================

    if (!res_category || !res_category.trim()) {
      return res.status(400).json({
        message: "Restaurant type is required.",
      });
    }

    const category = res_category.trim();

    // ========================================================
    // CHECK DUPLICATE
    // ========================================================

    const [existing] = await db.execute(
      `
        SELECT id
        FROM restaurant_category
        WHERE res_category = ?
        LIMIT 1
      `,
      [category]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "This restaurant type already exists.",
      });
    }

    // ========================================================
    // INSERT
    // ========================================================

    const [result] = await db.execute(
      `
        INSERT INTO restaurant_category (res_category)
        VALUES (?)
      `,
      [category]
    );

    return res.status(201).json({
      message: "Restaurant type created successfully.",
      id: result.insertId,
      res_category: category,
    });
  } catch (error) {
    console.error("Create restaurant category error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

// ============================================================
// UPDATE RESTAURANT CATEGORY
// ============================================================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { res_category } = req.body;

    // ========================================================
    // VALIDATE ID
    // ========================================================

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        message: "Invalid restaurant category ID.",
      });
    }

    // ========================================================
    // VALIDATE CATEGORY
    // ========================================================

    if (!res_category || !res_category.trim()) {
      return res.status(400).json({
        message: "Restaurant type is required.",
      });
    }

    const category = res_category.trim();

    // ========================================================
    // CHECK IF CATEGORY EXISTS
    // ========================================================

    const [existingCategory] = await db.execute(
      `
        SELECT id
        FROM restaurant_category
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        message: "Restaurant type not found.",
      });
    }

    // ========================================================
    // CHECK DUPLICATE
    // ========================================================

    const [duplicate] = await db.execute(
      `
        SELECT id
        FROM restaurant_category
        WHERE res_category = ?
        AND id != ?
        LIMIT 1
      `,
      [category, id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        message: "This restaurant type already exists.",
      });
    }

    // ========================================================
    // UPDATE
    // ========================================================

    await db.execute(
      `
        UPDATE restaurant_category
        SET res_category = ?
        WHERE id = ?
      `,
      [category, id]
    );

    return res.status(200).json({
      message: "Restaurant type updated successfully.",
      id: Number(id),
      res_category: category,
    });
  } catch (error) {
    console.error("Update restaurant category error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

// ============================================================
// DELETE RESTAURANT CATEGORY
// ============================================================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ========================================================
    // VALIDATE ID
    // ========================================================

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        message: "Invalid restaurant category ID.",
      });
    }

    // ========================================================
    // CHECK IF CATEGORY EXISTS
    // ========================================================

    const [existing] = await db.execute(
      `
        SELECT id
        FROM restaurant_category
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Restaurant type not found.",
      });
    }

    // ========================================================
    // DELETE
    // ========================================================

    await db.execute(
      `
        DELETE FROM restaurant_category
        WHERE id = ?
      `,
      [id]
    );

    return res.status(200).json({
      message: "Restaurant type deleted successfully.",
    });
  } catch (error) {
    console.error("Delete restaurant category error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

export default router;