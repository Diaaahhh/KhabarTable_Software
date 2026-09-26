import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * ============================================================================
 * HELPER: GET MULTIPLE RESTAURANT TYPES FROM COOKIE
 * ============================================================================
 *
 * Example users.restaurant_type:
 *
 * [4,3,5]
 *
 * Cookie may contain:
 *
 * "[4,3,5]"
 * ["4","3","5"]
 * [4,3,5]
 *
 * The function always returns:
 *
 * [4, 3, 5]
 */
const getRestaurantTypes = (req) => {
  try {
    const cookies = req.cookies || {};

    const possibleCookies = [
      cookies.user,
      cookies.auth,
      cookies.userInfo,
      cookies.user_info,
      cookies.restaurant,
      cookies.restaurant_type,
    ];

    /**
     * ---------------------------------------------------------
     * Helper to normalize restaurant_type
     * ---------------------------------------------------------
     */
    const normalizeRestaurantTypes = (value) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return null;
      }

      let parsedValue = value;

      // Decode URI encoded cookie value
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
          // If it is an old single numeric value
          const singleValue = Number(parsedValue);

          if (
            Number.isInteger(singleValue) &&
            singleValue > 0
          ) {
            return [singleValue];
          }

          return null;
        }
      }

      // Support a single number
      if (!Array.isArray(parsedValue)) {
        parsedValue = [parsedValue];
      }

      // Convert everything to numbers
      const restaurantTypeIds = parsedValue
        .map((id) => Number(id))
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0
        );

      if (restaurantTypeIds.length === 0) {
        return null;
      }

      // Remove duplicate IDs
      return [...new Set(restaurantTypeIds)];
    };

    /**
     * ---------------------------------------------------------
     * First check known cookies
     * ---------------------------------------------------------
     */
    for (const cookieValue of possibleCookies) {
      if (!cookieValue) continue;

      let parsedValue = cookieValue;

      try {
        parsedValue = decodeURIComponent(
          String(parsedValue)
        );
      } catch {
        // Continue with original value
      }

      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // Not JSON
      }

      // Cookie contains user object
      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        !Array.isArray(parsedValue) &&
        parsedValue.restaurant_type !== undefined
      ) {
        const restaurantTypes =
          normalizeRestaurantTypes(
            parsedValue.restaurant_type
          );

        if (restaurantTypes) {
          return restaurantTypes;
        }
      }

      // Direct restaurant_type cookie
      const directRestaurantTypes =
        normalizeRestaurantTypes(parsedValue);

      if (directRestaurantTypes) {
        return directRestaurantTypes;
      }
    }

    /**
     * ---------------------------------------------------------
     * Fallback: inspect all cookies
     * ---------------------------------------------------------
     */
    for (const cookieValue of Object.values(cookies)) {
      if (!cookieValue) continue;

      let parsedValue = cookieValue;

      try {
        parsedValue = decodeURIComponent(
          String(parsedValue)
        );
      } catch {
        // Continue
      }

      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // Continue
      }

      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        !Array.isArray(parsedValue) &&
        parsedValue.restaurant_type !== undefined
      ) {
        const restaurantTypes =
          normalizeRestaurantTypes(
            parsedValue.restaurant_type
          );

        if (restaurantTypes) {
          return restaurantTypes;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(
      "Error reading restaurant types:",
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
      getRestaurantTypes(req);

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
      getRestaurantTypes(req);

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
      getRestaurantTypes(req);

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

    const [variants] =
      await db.query(
        `
          SELECT
            id,
            variant_name
          FROM ${variantTable}
          ORDER BY variant_name ASC
        `
      );

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
      getRestaurantTypes(req);

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