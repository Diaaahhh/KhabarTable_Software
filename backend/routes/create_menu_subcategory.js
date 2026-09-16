import express from "express";
import db from "../db.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Get restaurant_type from cookie
|--------------------------------------------------------------------------
|
| Supports:
| 1. cookie.restaurant_type = "1"
| 2. cookie.restaurant_type = "restaurant"
| 3. cookie containing JSON data
|
*/
function getRestaurantTypeFromCookie(req) {
  if (!req.cookies) {
    return null;
  }

  // Direct cookie
  if (req.cookies.restaurant_type) {
    return req.cookies.restaurant_type;
  }

  // Check cookies that may contain JSON user data
  for (const cookieValue of Object.values(req.cookies)) {
    try {
      const decodedValue = decodeURIComponent(cookieValue);

      const parsedValue = JSON.parse(decodedValue);

      if (
        parsedValue &&
        parsedValue.restaurant_type !== undefined
      ) {
        return parsedValue.restaurant_type;
      }
    } catch {
      // Ignore cookies that are not JSON
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| GET /api/menu-subcategories
|--------------------------------------------------------------------------
| Fetch:
| - Menu categories according to cookie.restaurant_type
| - All menu ingredients
|--------------------------------------------------------------------------
*/
router.get("/", async (req, res) => {
  try {
    const restaurantType = getRestaurantTypeFromCookie(req);

    if (!restaurantType) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found in cookie.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Fetch Menu Categories
    |--------------------------------------------------------------------------
    |
    | restaurant_type is expected to contain the
    | restaurant_category ID.
    |
    */
    const [menuCategories] = await db.query(
      `
      SELECT
        id,
        category_name,
        Restaurant_category_id
      FROM menu_category
      WHERE Restaurant_category_id = ?
      ORDER BY category_name ASC
      `,
      [restaurantType],
    );

    /*
    |--------------------------------------------------------------------------
    | Fetch Ingredients
    |--------------------------------------------------------------------------
    |
    | menu_ingredients currently has no restaurant_type column,
    | so all ingredients are returned.
    |
    */
    const [ingredients] = await db.query(
      `
      SELECT
        id,
        ingredient_name,
        unit_id,
        cost_per_unit
      FROM menu_ingredients
      ORDER BY ingredient_name ASC
      `,
    );

    return res.status(200).json({
      success: true,
      data: {
        menuCategories,
        ingredients,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching menu subcategory data:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching menu data.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/menu-subcategories
|--------------------------------------------------------------------------
| Create:
|
| 1. menu_subcategory
| 2. multiple menu_subcategory_ingredients records
|--------------------------------------------------------------------------
*/
router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const restaurantType = getRestaurantTypeFromCookie(req);

    if (!restaurantType) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found in cookie.",
      });
    }

    const {
      menu_category_id,
      menu_name,
      ingredients,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!menu_category_id) {
      return res.status(400).json({
        success: false,
        message: "Menu category is required.",
      });
    }

    if (!menu_name || !menu_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Menu name is required.",
      });
    }

    if (
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one ingredient is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Menu Category
    |--------------------------------------------------------------------------
    |
    | Make sure the selected category belongs to the
    | restaurant type from the cookie.
    |
    */
    const [categoryRows] = await connection.query(
      `
      SELECT id
      FROM menu_category
      WHERE id = ?
        AND Restaurant_category_id = ?
      LIMIT 1
      `,
      [menu_category_id, restaurantType],
    );

    if (categoryRows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Selected menu category does not belong to your restaurant type.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Clean Ingredient IDs
    |--------------------------------------------------------------------------
    */

    const ingredientIds = [
      ...new Set(
        ingredients
          .map((id) => Number(id))
          .filter(
            (id) => Number.isInteger(id) && id > 0,
          ),
      ),
    ];

    if (ingredientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid ingredients are required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Ingredients Exist
    |--------------------------------------------------------------------------
    */

    const placeholders = ingredientIds
      .map(() => "?")
      .join(",");

    const [ingredientRows] = await connection.query(
      `
      SELECT id
      FROM menu_ingredients
      WHERE id IN (${placeholders})
      `,
      ingredientIds,
    );

    if (ingredientRows.length !== ingredientIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected ingredients do not exist.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Duplicate Menu Name
    |--------------------------------------------------------------------------
    */

    const [duplicateRows] = await connection.query(
      `
      SELECT id
      FROM menu_subcategory
      WHERE menu_category_id = ?
        AND menu_name = ?
      LIMIT 1
      `,
      [
        menu_category_id,
        menu_name.trim(),
      ],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "A sub-menu with this name already exists in this menu category.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Start Transaction
    |--------------------------------------------------------------------------
    */

    await connection.beginTransaction();

    /*
    |--------------------------------------------------------------------------
    | Insert Menu Subcategory
    |--------------------------------------------------------------------------
    */

    const [subcategoryResult] = await connection.query(
      `
      INSERT INTO menu_subcategory (
        menu_category_id,
        menu_name
      )
      VALUES (?, ?)
      `,
      [
        menu_category_id,
        menu_name.trim(),
      ],
    );

    const menuSubcategoryId =
      subcategoryResult.insertId;

    /*
    |--------------------------------------------------------------------------
    | Insert Multiple Ingredients
    |--------------------------------------------------------------------------
    */

    const ingredientValues = ingredientIds.map(
      (ingredientId) => [
        menuSubcategoryId,
        ingredientId,
      ],
    );

    await connection.query(
      `
      INSERT INTO menu_subcategory_ingredients (
        menu_subcategory_id,
        ingredient_id
      )
      VALUES ?
      `,
      [ingredientValues],
    );

    /*
    |--------------------------------------------------------------------------
    | Commit Transaction
    |--------------------------------------------------------------------------
    */

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Sub-menu created successfully.",
      data: {
        id: menuSubcategoryId,
        menu_category_id: Number(menu_category_id),
        menu_name: menu_name.trim(),
        ingredients: ingredientIds,
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Rollback
    |--------------------------------------------------------------------------
    */

    await connection.rollback();

    console.error(
      "Error creating menu subcategory:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Server error while creating sub-menu.",
    });
  } finally {
    connection.release();
  }
});

export default router;