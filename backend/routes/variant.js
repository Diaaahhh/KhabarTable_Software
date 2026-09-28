import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * ============================================================================
 * HELPER: GET LOGGED-IN USER ID FROM COOKIE
 * ============================================================================
 *
 * The cookie is only used to identify the logged-in user.
 * Restaurant type is NOT taken from the cookie.
 */
const getUserIdFromCookie = (req) => {
  try {
    const cookies = req.cookies || {};

    const possibleCookies = [
      cookies.user,
      cookies.auth,
      cookies.userInfo,
      cookies.user_info,
    ];

    for (const cookieValue of possibleCookies) {
      if (!cookieValue) continue;

      let parsedValue = cookieValue;

      // Decode URI encoded cookie
      if (typeof parsedValue === "string") {
        try {
          parsedValue = decodeURIComponent(parsedValue);
        } catch {
          // Keep original value
        }
      }

      // Try JSON parsing
      if (typeof parsedValue === "string") {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch {
          // Not JSON
        }
      }

      // If cookie contains a user object
      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        !Array.isArray(parsedValue)
      ) {
        const userId =
          parsedValue.id ??
          parsedValue.user_id ??
          parsedValue.userId;

        const numericUserId = Number(userId);

        if (
          Number.isInteger(numericUserId) &&
          numericUserId > 0
        ) {
          return numericUserId;
        }
      }

      // If cookie directly contains user ID
      const numericUserId = Number(parsedValue);

      if (
        Number.isInteger(numericUserId) &&
        numericUserId > 0
      ) {
        return numericUserId;
      }
    }

    return null;
  } catch (error) {
    console.error("Error reading user ID from cookie:", error);
    return null;
  }
};

/**
 * ============================================================================
 * HELPER: GET RESTAURANT TYPES FROM USERS TABLE
 * ============================================================================
 *
 * IMPORTANT:
 * Restaurant type is fetched from:
 *
 * users.restaurant_type
 *
 * The cookie is ONLY used to identify the logged-in user.
 */
const getRestaurantTypes = async (req) => {
  try {
    const userId = getUserIdFromCookie(req);

    if (!userId) {
      return null;
    }

    const [rows] = await db.query(
      `
        SELECT restaurant_type
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    let restaurantType = rows[0].restaurant_type;

    if (
      restaurantType === null ||
      restaurantType === undefined ||
      restaurantType === ""
    ) {
      return null;
    }

    // If MySQL/driver returns JSON as string
    if (typeof restaurantType === "string") {
      try {
        restaurantType = decodeURIComponent(restaurantType);
      } catch {
        // Keep original value
      }

      try {
        restaurantType = JSON.parse(restaurantType);
      } catch {
        // It may be a single numeric value
      }
    }

    // Support single numeric restaurant type
    if (!Array.isArray(restaurantType)) {
      restaurantType = [restaurantType];
    }

    // Convert IDs to numbers
    const restaurantTypeIds = restaurantType
      .map((id) => Number(id))
      .filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0
      );

    if (restaurantTypeIds.length === 0) {
      return null;
    }

    // Remove duplicates
    return [...new Set(restaurantTypeIds)];
  } catch (error) {
    console.error(
      "Error fetching restaurant types from users table:",
      error
    );

    return null;
  }
};

/**
 * ============================================================================
 * HELPER: CREATE SQL PLACEHOLDERS
 * ============================================================================
 *
 * Example:
 *
 * [4,3,5]
 *
 * becomes:
 *
 * ?,?,?
 */
const createPlaceholders = (values) =>
  values.map(() => "?").join(",");

/**
 * ============================================================================
 * GET CATEGORIES
 * ============================================================================
 *
 * GET /api/menu-varient/categories
 *
 * Example:
 *
 * restaurant_type = [4,3,5]
 *
 * Returns categories belonging to:
 *
 * restaurant type 4
 * restaurant type 3
 * restaurant type 5
 * ============================================================================
 */
router.get("/categories", async (req, res) => {
  try {
    const restaurantTypes =
      await getRestaurantTypes(req);

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Restaurant types not found in cookie.",
      });
    }

    const placeholders =
      createPlaceholders(restaurantTypes);

    const [categories] = await db.query(
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

    return res.status(200).json({
      success: true,

      // Useful for debugging/frontend
      restaurantTypes,

      data: categories,
    });
  } catch (error) {
    console.error(
      "Error fetching menu categories:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching categories.",
    });
  }
});

/**
 * ============================================================================
 * GET MENU ITEMS BY CATEGORY
 * ============================================================================
 *
 * GET /api/menu-varient/menu-items?category_id=1
 *
 * IMPORTANT:
 *
 * The selected category must belong to one of the user's
 * restaurant types.
 * ============================================================================
 */
router.get("/menu-items", async (req, res) => {
  try {
    const {
      category_id,
    } = req.query;

    const restaurantTypes =
      await getRestaurantTypes(req);

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Restaurant types not found in cookie.",
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message:
          "Category ID is required.",
      });
    }

    const categoryId =
      Number(category_id);

    if (
      !Number.isInteger(categoryId) ||
      categoryId < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid category ID is required.",
      });
    }

    const placeholders =
      createPlaceholders(restaurantTypes);

    /**
     * ---------------------------------------------------------
     * Check category belongs to user's restaurant types
     * ---------------------------------------------------------
     */
    const [categoryRows] =
      await db.query(
        `
          SELECT
            id,
            category_name,
            Restaurant_category_id
          FROM menu_category
          WHERE id = ?
            AND Restaurant_category_id IN (${placeholders})
          LIMIT 1
        `,
        [
          categoryId,
          ...restaurantTypes,
        ]
      );

    if (categoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Category not found or does not belong to your restaurant types.",
      });
    }

    /**
     * ---------------------------------------------------------
     * Fetch menu items
     * ---------------------------------------------------------
     */
    const [menuItems] =
      await db.query(
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
      success: true,

      category: categoryRows[0],

      data: menuItems,
    });
  } catch (error) {
    console.error(
      "Error fetching menu items:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching menu items.",
    });
  }
});

/**
 * ============================================================================
 * GET VARIANTS BY MENU ITEM
 * ============================================================================
 *
 * GET:
 *
 * /api/menu-varient/variants
 * ?menu_subcategory_id=5
 * &category_id=1
 * ============================================================================
 */
router.get("/variants", async (req, res) => {
  try {
    const {
      menu_subcategory_id,
      category_id,
    } = req.query;

    const restaurantTypes =
      await getRestaurantTypes(req);

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Restaurant types not found in cookie.",
      });
    }

    if (!menu_subcategory_id) {
      return res.status(400).json({
        success: false,
        message:
          "Menu item ID is required.",
      });
    }

    const menuSubcategoryId =
      Number(menu_subcategory_id);

    if (
      !Number.isInteger(menuSubcategoryId) ||
      menuSubcategoryId < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid menu item ID is required.",
      });
    }

    const restaurantPlaceholders =
      createPlaceholders(
        restaurantTypes
      );

    /**
     * ---------------------------------------------------------
     * Find menu item + category
     *
     * Also verify that the category belongs to one of the
     * user's restaurant types.
     * ---------------------------------------------------------
     */
    const [subcategoryRows] =
      await db.query(
        `
          SELECT
            ms.id,
            ms.menu_category_id,
            mc.category_name,
            mc.Restaurant_category_id
          FROM menu_subcategory ms

          INNER JOIN menu_category mc
            ON mc.id = ms.menu_category_id

          WHERE ms.id = ?
            AND mc.Restaurant_category_id IN (${restaurantPlaceholders})

          LIMIT 1
        `,
        [
          menuSubcategoryId,
          ...restaurantTypes,
        ]
      );

    if (subcategoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Menu item not found or does not belong to your restaurant types.",
      });
    }

    const categoryName =
      subcategoryRows[0].category_name || "";

    /**
     * ---------------------------------------------------------
     * Determine target variant table
     * ---------------------------------------------------------
     */
    const variantTable =
      categoryName
        .trim()
        .toLowerCase() === "pizza"
        ? "menu_variant_pizza"
        : "menu_variant";

    let variantQuery;

if (variantTable === "menu_variant_pizza") {
  // Pizza variants: numeric size order
  variantQuery = `
    SELECT
      id,
      variant_name
    FROM menu_variant_pizza
    ORDER BY
      CAST(REPLACE(variant_name, '"', '') AS DECIMAL(10,2)) ASC
  `;
} else {
  // Normal variants: fraction order first, then named sizes
  variantQuery = `
    SELECT
      id,
      variant_name
    FROM menu_variant
    ORDER BY
      CASE
        WHEN variant_name = '1:1' THEN 1
        WHEN variant_name = '1:2' THEN 2
        WHEN variant_name = '1:3' THEN 3
        WHEN variant_name = '1:4' THEN 4
        WHEN LOWER(variant_name) = 'full' THEN 5
        WHEN LOWER(variant_name) = 'half' THEN 6
        WHEN LOWER(variant_name) = 'small' THEN 7
        ELSE 999
      END ASC,
      variant_name ASC
  `;
}

const [variants] = await db.query(variantQuery);

    return res.status(200).json({
      success: true,

      category: {
        id:
          subcategoryRows[0]
            .menu_category_id,
        name: categoryName,
        restaurant_category_id:
          subcategoryRows[0]
            .Restaurant_category_id,
      },

      data: variants,
    });
  } catch (error) {
    console.error(
      "Error fetching variants:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching variants.",
    });
  }
});

/**
 * ============================================================================
 * GET INGREDIENTS BY MENU ITEM
 * ============================================================================
 *
 * GET /api/menu-varient/ingredients?menu_subcategory_id=5
 *
 * Also verifies that the menu item belongs to a category
 * available for the user's restaurant types.
 * ============================================================================
 */
router.get("/ingredients", async (req, res) => {
  try {
    const {
      menu_subcategory_id,
    } = req.query;

    const restaurantTypes =
      await getRestaurantTypes(req);

    if (
      !restaurantTypes ||
      restaurantTypes.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Restaurant types not found in cookie.",
      });
    }

    if (!menu_subcategory_id) {
      return res.status(400).json({
        success: false,
        message:
          "Menu item ID is required.",
      });
    }

    const menuSubcategoryId =
      Number(menu_subcategory_id);

    if (
      !Number.isInteger(menuSubcategoryId) ||
      menuSubcategoryId < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid menu item ID is required.",
      });
    }

    const placeholders =
      createPlaceholders(
        restaurantTypes
      );

    /**
     * ---------------------------------------------------------
     * Verify menu item belongs to user's restaurant types
     * ---------------------------------------------------------
     */
    const [menuItemRows] =
      await db.query(
        `
          SELECT
            ms.id,
            ms.menu_category_id,
            mc.category_name,
            mc.Restaurant_category_id
          FROM menu_subcategory ms

          INNER JOIN menu_category mc
            ON mc.id = ms.menu_category_id

          WHERE ms.id = ?
            AND mc.Restaurant_category_id IN (${placeholders})

          LIMIT 1
        `,
        [
          menuSubcategoryId,
          ...restaurantTypes,
        ]
      );

    if (menuItemRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Menu item not found or does not belong to your restaurant types.",
      });
    }

    /**
     * ---------------------------------------------------------
     * Fetch ingredients
     * ---------------------------------------------------------
     */
    const [ingredients] =
      await db.query(
        `
          SELECT
            mi.id,
            mi.ingredient_name,
            mi.unit_id,
            u.unit_name,
            mi.cost_per_unit
          FROM menu_subcategory_ingredients msi

          INNER JOIN menu_ingredients mi
            ON mi.id = msi.ingredient_id

          LEFT JOIN unit u
            ON u.id = mi.unit_id

          WHERE msi.menu_subcategory_id = ?

          ORDER BY mi.ingredient_name ASC
        `,
        [menuSubcategoryId]
      );

    return res.status(200).json({
      success: true,

      menuItem: menuItemRows[0],

      data: ingredients,
    });
  } catch (error) {
    console.error(
      "Error fetching ingredients:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching ingredients.",
    });
  }
});

/**
 * ============================================================================
 * CREATE MENU PRICES & INGREDIENT MAPPINGS
 * ============================================================================
 *
 * POST /api/menu-varient
 *
 * Supports:
 *
 * 1. Single item payload
 * 2. Array payload
 * 3. { variants: [...] } payload
 * ============================================================================
 */
router.post("/", async (req, res) => {
  let connection;

  try {
    let rawItems = [];

    if (Array.isArray(req.body)) {
      rawItems = req.body;
    } else if (
      req.body &&
      Array.isArray(req.body.variants)
    ) {
      const parentSubcategory =
        req.body.menu_subcategory_id;

      rawItems = req.body.variants.map(
        (v) => ({
          ...v,
          menu_subcategory_id:
            v.menu_subcategory_id ||
            parentSubcategory,
        })
      );
    } else if (req.body) {
      rawItems = [req.body];
    }

    if (rawItems.length === 0) {
      return res.status(400).json({
        message:
          "Payload cannot be empty.",
      });
    }

    /**
     * ---------------------------------------------------------
     * Normalize price / sell_price
     * ---------------------------------------------------------
     */
    const payloadItems =
      rawItems.map((item) => ({
        ...item,

        price:
          item.price !== undefined &&
          item.price !== null &&
          item.price !== ""
            ? item.price
            : item.sell_price,
      }));

    /**
     * ---------------------------------------------------------
     * Global Validation
     * ---------------------------------------------------------
     */
    for (const item of payloadItems) {
      const {
        menu_subcategory_id,
        price,
        ingredients,
      } = item;

      if (!menu_subcategory_id) {
        return res.status(400).json({
          message:
            "Menu item ID is required for all entries.",
        });
      }

      if (
        price === undefined ||
        price === null ||
        price === "" ||
        Number.isNaN(Number(price)) ||
        Number(price) <= 0
      ) {
        return res.status(400).json({
          message:
            "A valid selling price is required for each variant.",
        });
      }

      if (
        !Array.isArray(ingredients) ||
        ingredients.length === 0
      ) {
        return res.status(400).json({
          message:
            "At least one ingredient quantity is required per variant.",
        });
      }
    }

    connection =
      await db.getConnection();

    await connection.beginTransaction();

    const createdRecords = [];

    /**
     * ---------------------------------------------------------
     * Process each variant entry
     * ---------------------------------------------------------
     */
    for (const item of payloadItems) {
      const {
        menu_subcategory_id,
        variant_id,
        varient_id,
        ingredients,
        price,
        profit,
      } = item;

      const selectedVariantId =
        variant_id !== undefined &&
        variant_id !== null
          ? variant_id
          : varient_id !== undefined &&
              varient_id !== null
            ? varient_id
            : null;

      let finalVariantId = null;

      if (selectedVariantId) {
        finalVariantId =
          Number(selectedVariantId);
      }

      /**
       * -------------------------------------------------------
       * Calculate ingredient cost
       * -------------------------------------------------------
       */
      let calculatedTotalCost = 0;

      for (const ing of ingredients) {
        const ingredientId =
          Number(ing.ingredient_id);

        const quantity =
          Number(ing.quantity);

        if (
          !Number.isInteger(
            ingredientId
          ) ||
          ingredientId < 1
        ) {
          throw new Error(
            "Invalid ingredient ID."
          );
        }

        if (
          Number.isNaN(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            "Invalid ingredient quantity."
          );
        }

        const [costRows] =
          await connection.query(
            `
              SELECT cost_per_unit
              FROM menu_ingredients
              WHERE id = ?
              LIMIT 1
            `,
            [ingredientId]
          );

        if (costRows.length === 0) {
          throw new Error(
            `Ingredient ${ingredientId} not found.`
          );
        }

        const costPerUnit =
          Number(
            costRows[0]
              .cost_per_unit || 0
          );

        calculatedTotalCost +=
          costPerUnit * quantity;
      }

      const totalCostFormatted =
        Number(
          calculatedTotalCost.toFixed(2)
        );

      const priceFormatted =
        Number(
          Number(price).toFixed(2)
        );

      /**
       * Calculate profit server-side
       */
      const calculatedProfit =
        profit !== undefined &&
        profit !== null
          ? Number(
              Number(profit).toFixed(2)
            )
          : Number(
              (
                priceFormatted -
                totalCostFormatted
              ).toFixed(2)
            );

      /**
       * -------------------------------------------------------
       * Insert menu price
       * -------------------------------------------------------
       */
      const [priceResult] =
        await connection.query(
          `
            INSERT INTO menu_price (
              menu_subcategory_id,
              variant_id,
              cost,
              price,
              profit
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            Number(
              menu_subcategory_id
            ),
            finalVariantId,
            totalCostFormatted,
            priceFormatted,
            calculatedProfit,
          ]
        );

      const menuPriceId =
        priceResult.insertId;

      /**
       * -------------------------------------------------------
       * Insert ingredient mappings
       * -------------------------------------------------------
       */
      for (const ing of ingredients) {
        await connection.query(
          `
            INSERT INTO menu_price_ingredients (
              menu_price_id,
              menu_ingredient_id,
              quantity
            )
            VALUES (?, ?, ?)
          `,
          [
            menuPriceId,
            Number(
              ing.ingredient_id
            ),
            Number(ing.quantity),
          ]
        );
      }

      createdRecords.push({
        menu_price_id:
          menuPriceId,

        menu_subcategory_id:
          Number(
            menu_subcategory_id
          ),

        variant_id:
          finalVariantId,

        total_cost:
          totalCostFormatted,

        price:
          priceFormatted,

        profit:
          calculatedProfit,
      });
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message:
        "Menu prices and ingredient allocations created successfully.",
      data: createdRecords,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Rollback error:",
          rollbackError
        );
      }
    }

    console.error(
      "Error creating menu price and ingredients:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while saving menu prices and ingredients.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;