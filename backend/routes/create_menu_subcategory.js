import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * ============================================================================
 * Helper: Get logged-in user's restaurant_type from database
 * ============================================================================
 *
 * The auth cookie is used ONLY to identify the logged-in user.
 *
 * Example auth cookie:
 *
 * {
 *   "id": 7,
 *   "company_id": 445000,
 *   "company_name": "Dia Food Court",
 *   "restaurant_type": "1",
 *   "email": "dia@gmail.com",
 *   "role": 3
 * }
 *
 * IMPORTANT:
 * restaurant_type inside the cookie is intentionally NOT trusted.
 *
 * The current restaurant_type is ALWAYS read from:
 *
 * users.restaurant_type
 *
 * ============================================================================
 */
async function getRestaurantTypes(req) {
  const authCookie = req.cookies?.auth;

  if (!authCookie) {
    return {
      error: "Not authenticated.",
      status: 401,
    };
  }

  let authUser;

  try {
    let decodedCookie = authCookie;

    if (typeof decodedCookie === "string") {
      decodedCookie = decodeURIComponent(decodedCookie);
    }

    authUser =
      typeof decodedCookie === "string"
        ? JSON.parse(decodedCookie)
        : decodedCookie;
  } catch (error) {
    console.error("AUTH COOKIE PARSE ERROR:", error);

    return {
      error: "Invalid authentication cookie.",
      status: 401,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Get ONLY the user ID from auth cookie
   * --------------------------------------------------------------------------
   */
  const userId = Number(authUser?.id);

  if (!Number.isInteger(userId) || userId < 1) {
    return {
      error: "Invalid user ID.",
      status: 401,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Get CURRENT restaurant_type from users table
   * --------------------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * We do NOT use:
   *
   * authUser.restaurant_type
   *
   * Instead we always query the database.
   */
  const [users] = await db.query(
    `
      SELECT restaurant_type
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  /**
   * --------------------------------------------------------------------------
   * User not found
   * --------------------------------------------------------------------------
   */
  if (users.length === 0) {
    return {
      error: "User not found.",
      status: 401,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Get restaurant_type from database
   * --------------------------------------------------------------------------
   */
  let restaurantTypeValue = users[0].restaurant_type;

  if (
    restaurantTypeValue === null ||
    restaurantTypeValue === undefined ||
    restaurantTypeValue === ""
  ) {
    return {
      error: "Restaurant type not found.",
      status: 401,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Convert restaurant_type into an array
   * --------------------------------------------------------------------------
   *
   * Supported database values:
   *
   * "1"
   * 1
   * "[1,2]"
   * [1,2]
   * ["1","2"]
   */
  try {
    if (typeof restaurantTypeValue === "string") {
      const trimmedValue = restaurantTypeValue.trim();

      if (
        trimmedValue.startsWith("[") &&
        trimmedValue.endsWith("]")
      ) {
        restaurantTypeValue = JSON.parse(trimmedValue);
      } else {
        restaurantTypeValue = [trimmedValue];
      }
    } else if (!Array.isArray(restaurantTypeValue)) {
      restaurantTypeValue = [restaurantTypeValue];
    }
  } catch (error) {
    console.error("RESTAURANT TYPE PARSE ERROR:", error);

    return {
      error: "Invalid restaurant type data.",
      status: 500,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Normalize restaurant type IDs
   * --------------------------------------------------------------------------
   */
  const restaurantTypes = [
    ...new Set(
      restaurantTypeValue
        .map((type) => Number(type))
        .filter(
          (type) =>
            Number.isInteger(type) &&
            type > 0
        )
    ),
  ];

  if (restaurantTypes.length === 0) {
    return {
      error: "Restaurant type not found.",
      status: 401,
    };
  }

  return {
    userId,
    restaurantTypes,
  };
}

/**
 * ============================================================================
 * Helper: Build SQL placeholders for restaurant types
 * ============================================================================
 *
 * Example:
 *
 * restaurantTypes = [4, 3, 5]
 *
 * returns:
 *
 * "?,?,?"
 *
 * ============================================================================
 */
function buildPlaceholders(values) {
  return values.map(() => "?").join(",");
}

/**
 * ============================================================================
 * GET /api/menu-subcategories
 * ============================================================================
 *
 * Fetch:
 *
 * - Menu categories according to user's restaurant_type
 * - All ingredients
 *
 * ============================================================================
 */
router.get("/", async (req, res) => {
  try {
    const restaurantAuth = await getRestaurantTypes(req);

    if (restaurantAuth.error) {
      return res.status(restaurantAuth.status).json({
        success: false,
        message: restaurantAuth.error,
      });
    }

    const { restaurantTypes } = restaurantAuth;

    const placeholders =
      buildPlaceholders(restaurantTypes);

    /**
     * ------------------------------------------------------------------------
     * Fetch Menu Categories
     * ------------------------------------------------------------------------
     */
    const [menuCategories] = await db.query(
      `
        SELECT
          id,
          category_name,
          Restaurant_category_id
        FROM menu_category
        WHERE Restaurant_category_id IN (${placeholders})
        ORDER BY category_name ASC
      `,
      restaurantTypes
    );

    /**
     * ------------------------------------------------------------------------
     * Fetch Ingredients
     * ------------------------------------------------------------------------
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
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        restaurantTypes,
        menuCategories,
        ingredients,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching menu subcategory data:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching menu data.",
    });
  }
});

/**
 * ============================================================================
 * GET /api/menu-subcategories/list
 * ============================================================================
 *
 * Fetch:
 *
 * - Category
 * - Sub Menu
 * - Ingredients
 *
 * Only sub-menus belonging to the user's restaurant types.
 *
 * ============================================================================
 */
router.get("/list", async (req, res) => {
  try {
    const restaurantAuth =
      await getRestaurantTypes(req);

    if (restaurantAuth.error) {
      return res.status(restaurantAuth.status).json({
        success: false,
        message: restaurantAuth.error,
      });
    }

    const { restaurantTypes } = restaurantAuth;

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found.",
      });
    }

    const placeholders =
      buildPlaceholders(restaurantTypes);

    const [rows] = await db.query(
      `
        SELECT
          msc.id,
          msc.menu_category_id,
          mc.category_name,
          mc.Restaurant_category_id,
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

        WHERE mc.Restaurant_category_id IN (${placeholders})

        GROUP BY
          msc.id,
          msc.menu_category_id,
          mc.category_name,
          mc.Restaurant_category_id,
          msc.menu_name

        ORDER BY msc.id DESC
      `,
      restaurantTypes
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      "Error fetching menu subcategory list:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sub-menu list.",
    });
  }
});

/**
 * ============================================================================
 * GET /api/menu-subcategories/:id
 * ============================================================================
 *
 * Fetch one sub-menu including its ingredients.
 *
 * ============================================================================
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const restaurantAuth =
      await getRestaurantTypes(req);

    if (restaurantAuth.error) {
      return res.status(restaurantAuth.status).json({
        success: false,
        message: restaurantAuth.error,
      });
    }

    const { restaurantTypes } = restaurantAuth;

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found.",
      });
    }

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid sub-menu ID is required.",
      });
    }

    const placeholders =
      buildPlaceholders(restaurantTypes);

    const [rows] = await db.query(
      `
        SELECT
          msc.id,
          msc.menu_category_id,
          msc.menu_name,
          mc.category_name,
          mc.Restaurant_category_id

        FROM menu_subcategory msc

        INNER JOIN menu_category mc
          ON mc.id = msc.menu_category_id

        WHERE msc.id = ?
          AND mc.Restaurant_category_id IN (${placeholders})

        LIMIT 1
      `,
      [id, ...restaurantTypes]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sub-menu not found.",
      });
    }

    const [ingredientRows] =
      await db.query(
        `
          SELECT
            ingredient_id
          FROM menu_subcategory_ingredients
          WHERE menu_subcategory_id = ?
        `,
        [id]
      );

    return res.status(200).json({
      success: true,
      data: {
        ...rows[0],
        ingredients: ingredientRows.map(
          (row) => row.ingredient_id
        ),
      },
    });
  } catch (error) {
    console.error(
      "Error fetching sub-menu:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sub-menu.",
    });
  }
});

/**
 * ============================================================================
 * POST /api/menu-subcategories
 * ============================================================================
 *
 * Create:
 *
 * 1. menu_subcategory
 * 2. multiple menu_subcategory_ingredients
 *
 * ============================================================================
 */
router.post("/", async (req, res) => {
  const connection = await db.getConnection();

  let transactionStarted = false;

  try {
    const restaurantAuth =
      await getRestaurantTypes(req);

    if (restaurantAuth.error) {
      return res.status(restaurantAuth.status).json({
        success: false,
        message: restaurantAuth.error,
      });
    }

    const { restaurantTypes } = restaurantAuth;

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found.",
      });
    }

    const {
      menu_category_id,
      menu_name,
      ingredients,
    } = req.body;

    /**
     * ------------------------------------------------------------------------
     * Validation
     * ------------------------------------------------------------------------
     */
    const menuCategoryId =
      Number(menu_category_id);

    if (
      !Number.isInteger(menuCategoryId) ||
      menuCategoryId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Menu category is required.",
      });
    }

    if (
      !menu_name ||
      !menu_name.trim()
    ) {
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

    const placeholders =
      buildPlaceholders(restaurantTypes);

    /**
     * ------------------------------------------------------------------------
     * Check Menu Category
     * ------------------------------------------------------------------------
     */
    const [categoryRows] =
      await connection.query(
        `
          SELECT
            id,
            Restaurant_category_id
          FROM menu_category
          WHERE id = ?
            AND Restaurant_category_id IN (${placeholders})
          LIMIT 1
        `,
        [
          menuCategoryId,
          ...restaurantTypes,
        ]
      );

    if (categoryRows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Selected menu category does not belong to your restaurant types.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Clean Ingredient IDs
     * ------------------------------------------------------------------------
     */
    const ingredientIds = [
      ...new Set(
        ingredients
          .map((id) => Number(id))
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          )
      ),
    ];

    if (ingredientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Valid ingredients are required.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Check Ingredients Exist
     * ------------------------------------------------------------------------
     */
    const ingredientPlaceholders =
      buildPlaceholders(ingredientIds);

    const [ingredientRows] =
      await connection.query(
        `
          SELECT id
          FROM menu_ingredients
          WHERE id IN (${ingredientPlaceholders})
        `,
        ingredientIds
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

    /**
     * ------------------------------------------------------------------------
     * Check Duplicate Menu Name
     * ------------------------------------------------------------------------
     */
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
          menuCategoryId,
          menu_name.trim(),
        ]
      );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "A sub-menu with this name already exists in this menu category.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Start Transaction
     * ------------------------------------------------------------------------
     */
    await connection.beginTransaction();
    transactionStarted = true;

    /**
     * ------------------------------------------------------------------------
     * Insert Menu Subcategory
     * ------------------------------------------------------------------------
     */
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
          menuCategoryId,
          menu_name.trim(),
        ]
      );

    const menuSubcategoryId =
      subcategoryResult.insertId;

    /**
     * ------------------------------------------------------------------------
     * Insert Ingredients
     * ------------------------------------------------------------------------
     */
    const ingredientValues =
      ingredientIds.map(
        (ingredientId) => [
          menuSubcategoryId,
          ingredientId,
        ]
      );

    await connection.query(
      `
        INSERT INTO menu_subcategory_ingredients (
          menu_subcategory_id,
          ingredient_id
        )
        VALUES ?
      `,
      [ingredientValues]
    );

    /**
     * ------------------------------------------------------------------------
     * Commit
     * ------------------------------------------------------------------------
     */
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message:
        "Sub-menu created successfully.",
      data: {
        id: menuSubcategoryId,
        menu_category_id:
          menuCategoryId,
        menu_name:
          menu_name.trim(),
        ingredients:
          ingredientIds,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "Error creating menu subcategory:",
      error
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
 * ============================================================================
 * PUT /api/menu-subcategories/:id
 * ============================================================================
 *
 * Update:
 *
 * - Menu category
 * - Menu name
 * - Ingredients
 *
 * ============================================================================
 */
router.put("/:id", async (req, res) => {
  const connection = await db.getConnection();

  let transactionStarted = false;

  try {
    const id = Number(req.params.id);

    const restaurantAuth =
      await getRestaurantTypes(req);

    if (restaurantAuth.error) {
      return res.status(restaurantAuth.status).json({
        success: false,
        message: restaurantAuth.error,
      });
    }

    const { restaurantTypes } = restaurantAuth;

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Restaurant type not found.",
      });
    }

    if (
      !Number.isInteger(id) ||
      id < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid sub-menu ID is required.",
      });
    }

    const {
      menu_category_id,
      menu_name,
      ingredients,
    } = req.body;

    const menuCategoryId =
      Number(menu_category_id);

    /**
     * ------------------------------------------------------------------------
     * Validate
     * ------------------------------------------------------------------------
     */
    if (
      !Number.isInteger(menuCategoryId) ||
      menuCategoryId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Menu category is required.",
      });
    }

    if (
      !menu_name ||
      !menu_name.trim()
    ) {
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

    const restaurantPlaceholders =
      buildPlaceholders(restaurantTypes);

    /**
     * ------------------------------------------------------------------------
     * Check selected category belongs to user's restaurant types
     * ------------------------------------------------------------------------
     */
    const [categoryRows] =
      await connection.query(
        `
          SELECT
            id,
            Restaurant_category_id
          FROM menu_category
          WHERE id = ?
            AND Restaurant_category_id IN (${restaurantPlaceholders})
          LIMIT 1
        `,
        [
          menuCategoryId,
          ...restaurantTypes,
        ]
      );

    if (categoryRows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Selected menu category does not belong to your restaurant types.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Clean Ingredients
     * ------------------------------------------------------------------------
     */
    const ingredientIds = [
      ...new Set(
        ingredients
          .map((id) => Number(id))
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          )
      ),
    ];

    if (ingredientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Valid ingredients are required.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Check Ingredients
     * ------------------------------------------------------------------------
     */
    const ingredientPlaceholders =
      buildPlaceholders(ingredientIds);

    const [ingredientRows] =
      await connection.query(
        `
          SELECT id
          FROM menu_ingredients
          WHERE id IN (${ingredientPlaceholders})
        `,
        ingredientIds
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

    /**
     * ------------------------------------------------------------------------
     * Check Duplicate Name
     * ------------------------------------------------------------------------
     */
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
          menuCategoryId,
          menu_name.trim(),
          id,
        ]
      );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "A sub-menu with this name already exists in this menu category.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Check Existing Sub-menu belongs to user's restaurant types
     * ------------------------------------------------------------------------
     */
    const [existingRows] =
      await connection.query(
        `
          SELECT
            msc.id
          FROM menu_subcategory msc

          INNER JOIN menu_category mc
            ON mc.id = msc.menu_category_id

          WHERE msc.id = ?
            AND mc.Restaurant_category_id IN (${restaurantPlaceholders})

          LIMIT 1
        `,
        [
          id,
          ...restaurantTypes,
        ]
      );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Sub-menu not found.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Start Transaction
     * ------------------------------------------------------------------------
     */
    await connection.beginTransaction();
    transactionStarted = true;

    /**
     * ------------------------------------------------------------------------
     * Update Sub-menu
     * ------------------------------------------------------------------------
     */
    await connection.query(
      `
        UPDATE menu_subcategory
        SET
          menu_category_id = ?,
          menu_name = ?
        WHERE id = ?
      `,
      [
        menuCategoryId,
        menu_name.trim(),
        id,
      ]
    );

    /**
     * ------------------------------------------------------------------------
     * Remove Old Ingredients
     * ------------------------------------------------------------------------
     */
    await connection.query(
      `
        DELETE FROM menu_subcategory_ingredients
        WHERE menu_subcategory_id = ?
      `,
      [id]
    );

    /**
     * ------------------------------------------------------------------------
     * Insert New Ingredients
     * ------------------------------------------------------------------------
     */
    const ingredientValues =
      ingredientIds.map(
        (ingredientId) => [
          id,
          ingredientId,
        ]
      );

    await connection.query(
      `
        INSERT INTO menu_subcategory_ingredients (
          menu_subcategory_id,
          ingredient_id
        )
        VALUES ?
      `,
      [ingredientValues]
    );

    /**
     * ------------------------------------------------------------------------
     * Commit
     * ------------------------------------------------------------------------
     */
    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        "Sub-menu updated successfully.",
      data: {
        id,
        menu_category_id:
          menuCategoryId,
        menu_name:
          menu_name.trim(),
        ingredients:
          ingredientIds,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "Error updating menu subcategory:",
      error
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
 * ============================================================================
 * DELETE /api/menu-subcategories/:id
 * ============================================================================
 *
 * Delete:
 *
 * - menu_subcategory_ingredients
 * - menu_subcategory
 *
 * ============================================================================
 */
router.delete("/:id", async (req, res) => {
  const connection = await db.getConnection();

  let transactionStarted = false;

  try {
    const id = Number(req.params.id);

    const restaurantAuth =
      await getRestaurantTypes(req);

    if (restaurantAuth.error) {
      return res.status(restaurantAuth.status).json({
        success: false,
        message: restaurantAuth.error,
      });
    }

    const { restaurantTypes } = restaurantAuth;

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Restaurant type not found.",
      });
    }

    if (
      !Number.isInteger(id) ||
      id < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid sub-menu ID is required.",
      });
    }

    const placeholders =
      buildPlaceholders(restaurantTypes);

    /**
     * ------------------------------------------------------------------------
     * Check Sub-menu belongs to user's restaurant types
     * ------------------------------------------------------------------------
     */
    const [existingRows] =
      await connection.query(
        `
          SELECT
            msc.id,
            msc.menu_name,
            mc.Restaurant_category_id
          FROM menu_subcategory msc

          INNER JOIN menu_category mc
            ON mc.id = msc.menu_category_id

          WHERE msc.id = ?
            AND mc.Restaurant_category_id IN (${placeholders})

          LIMIT 1
        `,
        [
          id,
          ...restaurantTypes,
        ]
      );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Sub-menu not found.",
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Start Transaction
     * ------------------------------------------------------------------------
     */
    await connection.beginTransaction();
    transactionStarted = true;

    /**
     * ------------------------------------------------------------------------
     * Delete Ingredient Relations
     * ------------------------------------------------------------------------
     */
    await connection.query(
      `
        DELETE FROM menu_subcategory_ingredients
        WHERE menu_subcategory_id = ?
      `,
      [id]
    );

    /**
     * ------------------------------------------------------------------------
     * Delete Sub-menu
     * ------------------------------------------------------------------------
     */
    await connection.query(
      `
        DELETE FROM menu_subcategory
        WHERE id = ?
      `,
      [id]
    );

    /**
     * ------------------------------------------------------------------------
     * Commit
     * ------------------------------------------------------------------------
     */
    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        "Sub-menu deleted successfully.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "Error deleting menu subcategory:",
      error
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