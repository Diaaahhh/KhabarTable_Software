import express from "express";
import db from "../db.js";

const router = express.Router();

// =========================================================
// HELPER: GET RESTAURANT TYPE FROM COOKIE
// =========================================================
//
// The cookie may contain:
//   cafe
//
// or:
//   "cafe"
//
// or even:
//   "\"cafe\""
//
// This helper normalizes all of them to:
//   cafe
//
// =========================================================

const getRestaurantType = (req) => {
  let restaurantType = req.cookies?.restaurant_type;

  if (!restaurantType) {
    return null;
  }

  // Remove whitespace
  restaurantType = String(restaurantType).trim();

  // Try JSON decoding if the value is JSON encoded
  try {
    const decoded = JSON.parse(restaurantType);

    if (typeof decoded === "string") {
      restaurantType = decoded;
    }
  } catch {
    // Value was not JSON encoded; continue normally
  }

  // Remove accidental surrounding quotes
  restaurantType = restaurantType
    .replace(/^"+|"+$/g, "")
    .trim();

  return restaurantType || null;
};

// =========================================================
// GET CATEGORIES
// =========================================================
//
// GET /api/menu-varient/categories
//
// Reads restaurant_type from cookie and fetches categories
// belonging to that restaurant type.
//
// =========================================================

router.get("/categories", async (req, res) => {
  try {
    const restaurantType = getRestaurantType(req);

    console.log(
      "Restaurant type from cookie:",
      req.cookies?.restaurant_type
    );

    console.log(
      "Normalized restaurant type:",
      restaurantType
    );

    if (!restaurantType) {
      return res.status(401).json({
        message: "Restaurant type not found in cookie.",
      });
    }

    const [categories] = await db.query(
      `
      SELECT
        id,
        category_name,
        Restaurant_category_id
      FROM menu_category
      WHERE Restaurant_category_id = ?
      ORDER BY category_name ASC
      `,
      [restaurantType]
    );

    console.log(
      "Categories found:",
      categories.length
    );

    return res.status(200).json({
      categories,
    });
  } catch (error) {
    console.error(
      "Error fetching menu categories:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching categories.",
    });
  }
});

// =========================================================
// GET MENU ITEMS BY CATEGORY
// =========================================================
//
// GET /api/menu-varient/menu-items/:categoryId
//
// Fetch menu_subcategory records where:
// menu_category_id = selected category ID
//
// =========================================================

router.get("/menu-items/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        message: "Category ID is required.",
      });
    }

    const [menuItems] = await db.query(
      `
      SELECT
        id,
        menu_category_id,
        menu_name
      FROM menu_subcategory
      WHERE menu_category_id = ?
      ORDER BY menu_name ASC
      `,
      [categoryId]
    );

    return res.status(200).json({
      menuItems,
    });
  } catch (error) {
    console.error(
      "Error fetching menu items:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching menu items.",
    });
  }
});

// =========================================================
// CREATE VARIANT & PRICE
// =========================================================
//
// POST /api/menu-varient
//
// Expected body:
//
// {
//   category_id: 1,
//   menu_item_id: 5,
//   variant: "Large",
//   price: 250
// }
//
// =========================================================

router.post("/", async (req, res) => {
  try {
    const {
      category_id,
      menu_item_id,
      variant,
      price,
    } = req.body;

    // -------------------------------------------------------
    // Validation
    // -------------------------------------------------------

    if (!category_id) {
      return res.status(400).json({
        message: "Category is required.",
      });
    }

    if (!menu_item_id) {
      return res.status(400).json({
        message: "Menu item is required.",
      });
    }

    if (!variant || !variant.trim()) {
      return res.status(400).json({
        message: "Variant is required.",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Valid price is required.",
      });
    }

    // -------------------------------------------------------
    // Check category
    // -------------------------------------------------------

    const [categoryRows] = await db.query(
      `
      SELECT id
      FROM menu_category
      WHERE id = ?
      LIMIT 1
      `,
      [category_id]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({
        message: "Category not found.",
      });
    }

    // -------------------------------------------------------
    // Check menu item belongs to selected category
    // -------------------------------------------------------

    const [menuItemRows] = await db.query(
      `
      SELECT id
      FROM menu_subcategory
      WHERE id = ?
      AND menu_category_id = ?
      LIMIT 1
      `,
      [menu_item_id, category_id]
    );

    if (menuItemRows.length === 0) {
      return res.status(400).json({
        message:
          "Selected menu item does not belong to this category.",
      });
    }

    // -------------------------------------------------------
    // Check duplicate variant
    // -------------------------------------------------------

    const [existingVariant] = await db.query(
      `
      SELECT id
      FROM menu_varient
      WHERE menu_item_id = ?
      AND variant = ?
      LIMIT 1
      `,
      [
        menu_item_id,
        variant.trim(),
      ]
    );

    if (existingVariant.length > 0) {
      return res.status(409).json({
        message:
          "This variant already exists for the selected menu item.",
      });
    }

    // -------------------------------------------------------
    // Insert variant
    // -------------------------------------------------------

    const [result] = await db.query(
      `
      INSERT INTO menu_varient
      (
        category_id,
        menu_item_id,
        variant,
        price
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        category_id,
        menu_item_id,
        variant.trim(),
        Number(price),
      ]
    );

    return res.status(201).json({
      message:
        "Variant and price created successfully.",
      id: result.insertId,
    });
  } catch (error) {
    console.error(
      "Error creating variant:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while creating variant.",
    });
  }
});

export default router;