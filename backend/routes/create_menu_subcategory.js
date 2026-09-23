import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * --------------------------------------------------------------------------
 * Get restaurant_type from cookie
 * --------------------------------------------------------------------------
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

/**
 * --------------------------------------------------------------------------
 * GET /api/menu-subcategories
 * --------------------------------------------------------------------------
 * Fetch:
 * - Menu categories according to restaurant type
 * - All ingredients
 * --------------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Fetch Menu Categories
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Fetch Ingredients
    // -----------------------------------------------------------------------
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

/**
 * --------------------------------------------------------------------------
 * GET /api/menu-subcategories/list
 * --------------------------------------------------------------------------
 * Fetch table data:
 *
 * Category
 * Sub Menu
 * Ingredients
 * --------------------------------------------------------------------------
 */
router.get("/list", async (req, res) => {
  try {
    const restaurantType = getRestaurantTypeFromCookie(req);

    if (!restaurantType) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found in cookie.",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          msc.id,
          msc.menu_category_id,
          mc.category_name,
          msc.menu_name,
          COALESCE(
            GROUP_CONCAT(
              DISTINCT mi.ingredient_name
              ORDER BY mi.ingredient_name
              SEPARATOR ', '
            ),
            ''
          ) AS ingredients
        FROM menu_subcategory msc

        INNER JOIN menu_category mc
          ON mc.id = msc.menu_category_id

        LEFT JOIN menu_subcategory_ingredients msci
          ON msci.menu_subcategory_id = msc.id

        LEFT JOIN menu_ingredients mi
          ON mi.id = msci.ingredient_id

        WHERE mc.Restaurant_category_id = ?

        GROUP BY
          msc.id,
          msc.menu_category_id,
          mc.category_name,
          msc.menu_name

        ORDER BY msc.id DESC
      `,
      [restaurantType],
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      "Error fetching menu subcategory list:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sub-menu list.",
    });
  }
});

/**
 * --------------------------------------------------------------------------
 * GET /api/menu-subcategories/:id
 * --------------------------------------------------------------------------
 * Fetch one sub-menu including its ingredients
 * --------------------------------------------------------------------------
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const restaurantType = getRestaurantTypeFromCookie(req);

    if (!restaurantType) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found in cookie.",
      });
    }

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid sub-menu ID is required.",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          msc.id,
          msc.menu_category_id,
          msc.menu_name,
          mc.category_name
        FROM menu_subcategory msc

        INNER JOIN menu_category mc
          ON mc.id = msc.menu_category_id

        WHERE msc.id = ?
          AND mc.Restaurant_category_id = ?

        LIMIT 1
      `,
      [id, restaurantType],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sub-menu not found.",
      });
    }

    const [ingredientRows] = await db.query(
      `
        SELECT
          ingredient_id
        FROM menu_subcategory_ingredients
        WHERE menu_subcategory_id = ?
      `,
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...rows[0],
        ingredients: ingredientRows.map(
          (row) => row.ingredient_id,
        ),
      },
    });
  } catch (error) {
    console.error(
      "Error fetching sub-menu:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sub-menu.",
    });
  }
});

/**
 * --------------------------------------------------------------------------
 * POST /api/menu-subcategories
 * --------------------------------------------------------------------------
 * Create:
 * 1. menu_subcategory
 * 2. multiple menu_subcategory_ingredients
 * --------------------------------------------------------------------------
 */
router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const restaurantType =
      getRestaurantTypeFromCookie(req);

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

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Check Menu Category
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Clean Ingredient IDs
    // -----------------------------------------------------------------------
    const ingredientIds = [
      ...new Set(
        ingredients
          .map((id) => Number(id))
          .filter(
            (id) =>
              Number.isInteger(id) && id > 0,
          ),
      ),
    ];

    if (ingredientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid ingredients are required.",
      });
    }

    // -----------------------------------------------------------------------
    // Check Ingredients Exist
    // -----------------------------------------------------------------------
    const placeholders = ingredientIds
      .map(() => "?")
      .join(",");

    const [ingredientRows] =
      await connection.query(
        `
          SELECT id
          FROM menu_ingredients
          WHERE id IN (${placeholders})
        `,
        ingredientIds,
      );

    if (
      ingredientRows.length !==
      ingredientIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected ingredients do not exist.",
      });
    }

    // -----------------------------------------------------------------------
    // Check Duplicate Menu Name
    // -----------------------------------------------------------------------
    const [duplicateRows] =
      await connection.query(
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

    // -----------------------------------------------------------------------
    // Start Transaction
    // -----------------------------------------------------------------------
    await connection.beginTransaction();

    // -----------------------------------------------------------------------
    // Insert Menu Subcategory
    // -----------------------------------------------------------------------
    const [subcategoryResult] =
      await connection.query(
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

    // -----------------------------------------------------------------------
    // Insert Ingredients
    // -----------------------------------------------------------------------
    const ingredientValues =
      ingredientIds.map(
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

    // -----------------------------------------------------------------------
    // Commit
    // -----------------------------------------------------------------------
    await connection.commit();

    return res.status(201).json({
      success: true,
      message:
        "Sub-menu created successfully.",
      data: {
        id: menuSubcategoryId,
        menu_category_id:
          Number(menu_category_id),
        menu_name: menu_name.trim(),
        ingredients: ingredientIds,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Error creating menu subcategory:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating sub-menu.",
    });
  } finally {
    connection.release();
  }
});

/**
 * --------------------------------------------------------------------------
 * PUT /api/menu-subcategories/:id
 * --------------------------------------------------------------------------
 * Update:
 * - Menu category
 * - Menu name
 * - Ingredients
 * --------------------------------------------------------------------------
 */
router.put("/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const id = Number(req.params.id);

    const restaurantType =
      getRestaurantTypeFromCookie(req);

    if (!restaurantType) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found in cookie.",
      });
    }

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid sub-menu ID is required.",
      });
    }

    const {
      menu_category_id,
      menu_name,
      ingredients,
    } = req.body;

    // -----------------------------------------------------------------------
    // Validate
    // -----------------------------------------------------------------------
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
        message:
          "At least one ingredient is required.",
      });
    }

    // -----------------------------------------------------------------------
    // Check category belongs to restaurant type
    // -----------------------------------------------------------------------
    const [categoryRows] =
      await connection.query(
        `
          SELECT id
          FROM menu_category
          WHERE id = ?
            AND Restaurant_category_id = ?
          LIMIT 1
        `,
        [
          menu_category_id,
          restaurantType,
        ],
      );

    if (categoryRows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Selected menu category does not belong to your restaurant type.",
      });
    }

    // -----------------------------------------------------------------------
    // Clean ingredients
    // -----------------------------------------------------------------------
    const ingredientIds = [
      ...new Set(
        ingredients
          .map((id) => Number(id))
          .filter(
            (id) =>
              Number.isInteger(id) && id > 0,
          ),
      ),
    ];

    if (ingredientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid ingredients are required.",
      });
    }

    // -----------------------------------------------------------------------
    // Check ingredients
    // -----------------------------------------------------------------------
    const placeholders = ingredientIds
      .map(() => "?")
      .join(",");

    const [ingredientRows] =
      await connection.query(
        `
          SELECT id
          FROM menu_ingredients
          WHERE id IN (${placeholders})
        `,
        ingredientIds,
      );

    if (
      ingredientRows.length !==
      ingredientIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected ingredients do not exist.",
      });
    }

    // -----------------------------------------------------------------------
    // Check duplicate name
    // Exclude current sub-menu
    // -----------------------------------------------------------------------
    const [duplicateRows] =
      await connection.query(
        `
          SELECT id
          FROM menu_subcategory
          WHERE menu_category_id = ?
            AND menu_name = ?
            AND id != ?
          LIMIT 1
        `,
        [
          menu_category_id,
          menu_name.trim(),
          id,
        ],
      );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "A sub-menu with this name already exists in this menu category.",
      });
    }

    // -----------------------------------------------------------------------
    // Check sub-menu belongs to restaurant type
    // -----------------------------------------------------------------------
    const [existingRows] =
      await connection.query(
        `
          SELECT
            msc.id
          FROM menu_subcategory msc
          INNER JOIN menu_category mc
            ON mc.id = msc.menu_category_id
          WHERE msc.id = ?
            AND mc.Restaurant_category_id = ?
          LIMIT 1
        `,
        [id, restaurantType],
      );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Sub-menu not found.",
      });
    }

    // -----------------------------------------------------------------------
    // Start transaction
    // -----------------------------------------------------------------------
    await connection.beginTransaction();

    // -----------------------------------------------------------------------
    // Update sub-menu
    // -----------------------------------------------------------------------
    await connection.query(
      `
        UPDATE menu_subcategory
        SET
          menu_category_id = ?,
          menu_name = ?
        WHERE id = ?
      `,
      [
        menu_category_id,
        menu_name.trim(),
        id,
      ],
    );

    // -----------------------------------------------------------------------
    // Remove old ingredients
    // -----------------------------------------------------------------------
    await connection.query(
      `
        DELETE FROM menu_subcategory_ingredients
        WHERE menu_subcategory_id = ?
      `,
      [id],
    );

    // -----------------------------------------------------------------------
    // Insert new ingredients
    // -----------------------------------------------------------------------
    const ingredientValues =
      ingredientIds.map(
        (ingredientId) => [
          id,
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

    // -----------------------------------------------------------------------
    // Commit
    // -----------------------------------------------------------------------
    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        "Sub-menu updated successfully.",
      data: {
        id,
        menu_category_id:
          Number(menu_category_id),
        menu_name: menu_name.trim(),
        ingredients: ingredientIds,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Error updating menu subcategory:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating sub-menu.",
    });
  } finally {
    connection.release();
  }
});

/**
 * --------------------------------------------------------------------------
 * DELETE /api/menu-subcategories/:id
 * --------------------------------------------------------------------------
 * Delete:
 * - menu_subcategory_ingredients
 * - menu_subcategory
 * --------------------------------------------------------------------------
 */
router.delete("/:id", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const id = Number(req.params.id);

    const restaurantType =
      getRestaurantTypeFromCookie(req);

    if (!restaurantType) {
      return res.status(401).json({
        success: false,
        message:
          "Restaurant type not found in cookie.",
      });
    }

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message:
          "Valid sub-menu ID is required.",
      });
    }

    // -----------------------------------------------------------------------
    // Check sub-menu belongs to restaurant type
    // -----------------------------------------------------------------------
    const [existingRows] =
      await connection.query(
        `
          SELECT
            msc.id,
            msc.menu_name
          FROM menu_subcategory msc
          INNER JOIN menu_category mc
            ON mc.id = msc.menu_category_id
          WHERE msc.id = ?
            AND mc.Restaurant_category_id = ?
          LIMIT 1
        `,
        [id, restaurantType],
      );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Sub-menu not found.",
      });
    }

    await connection.beginTransaction();

    // -----------------------------------------------------------------------
    // Delete ingredient relations
    // -----------------------------------------------------------------------
    await connection.query(
      `
        DELETE FROM menu_subcategory_ingredients
        WHERE menu_subcategory_id = ?
      `,
      [id],
    );

    // -----------------------------------------------------------------------
    // Delete sub-menu
    // -----------------------------------------------------------------------
    await connection.query(
      `
        DELETE FROM menu_subcategory
        WHERE id = ?
      `,
      [id],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        "Sub-menu deleted successfully.",
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Error deleting menu subcategory:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting sub-menu.",
    });
  } finally {
    connection.release();
  }
});

export default router;