import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * ============================================================================
 * HELPER: GET LOGGED-IN USER ID FROM COOKIE
 * ============================================================================
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

      if (typeof parsedValue === "string") {
        try {
          parsedValue = decodeURIComponent(parsedValue);
        } catch {
          // keep original
        }
      }

      if (typeof parsedValue === "string") {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch {
          // not JSON
        }
      }

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

        if (Number.isInteger(numericUserId) && numericUserId > 0) {
          return numericUserId;
        }
      }

      const numericUserId = Number(parsedValue);

      if (Number.isInteger(numericUserId) && numericUserId > 0) {
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
      [userId],
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

    if (typeof restaurantType === "string") {
      try {
        restaurantType = decodeURIComponent(restaurantType);
      } catch {
        // keep original
      }

      try {
        restaurantType = JSON.parse(restaurantType);
      } catch {
        // may be a single numeric value
      }
    }

    if (!Array.isArray(restaurantType)) {
      restaurantType = [restaurantType];
    }

    const restaurantTypeIds = restaurantType
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (restaurantTypeIds.length === 0) {
      return null;
    }

    return [...new Set(restaurantTypeIds)];
  } catch (error) {
    console.error(
      "Error fetching restaurant types from users table:",
      error,
    );

    return null;
  }
};

/**
 * ============================================================================
 * HELPER: CREATE SQL PLACEHOLDERS
 * ============================================================================
 */
const createPlaceholders = (values) => values.map(() => "?").join(",");

/**
 * ============================================================================
 * GET CATEGORIES
 * ============================================================================
 */
router.get("/categories", async (req, res) => {
  try {
    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    const placeholders = createPlaceholders(restaurantTypes);

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
      restaurantTypes,
    );

    return res.status(200).json({
      success: true,
      restaurantTypes,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching menu categories:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching categories.",
    });
  }
});

/**
 * ============================================================================
 * GET MENU ITEMS BY CATEGORY
 * ============================================================================
 */
router.get("/menu-items", async (req, res) => {
  try {
    const { category_id } = req.query;

    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required.",
      });
    }

    const categoryId = Number(category_id);

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required.",
      });
    }

    const placeholders = createPlaceholders(restaurantTypes);

    const [categoryRows] = await db.query(
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
      [categoryId, ...restaurantTypes],
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Category not found or does not belong to your restaurant types.",
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
      [categoryId],
    );

    return res.status(200).json({
      success: true,
      category: categoryRows[0],
      data: menuItems,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching menu items.",
    });
  }
});

/**
 * ============================================================================
 * GET VARIANTS BY MENU ITEM
 * ============================================================================
 */
router.get("/variants", async (req, res) => {
  try {
    const { menu_subcategory_id } = req.query;

    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    if (!menu_subcategory_id) {
      return res.status(400).json({
        success: false,
        message: "Menu item ID is required.",
      });
    }

    const menuSubcategoryId = Number(menu_subcategory_id);

    if (!Number.isInteger(menuSubcategoryId) || menuSubcategoryId < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid menu item ID is required.",
      });
    }

    const restaurantPlaceholders = createPlaceholders(restaurantTypes);

    /*
     * ============================================================
     * FIND MENU ITEM + CATEGORY
     * ============================================================
     */
    const [subcategoryRows] = await db.query(
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
      [menuSubcategoryId, ...restaurantTypes],
    );

    if (subcategoryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Menu item not found or does not belong to your restaurant types.",
      });
    }

    const categoryName = subcategoryRows[0].category_name || "";

    /*
     * ============================================================
     * DETERMINE WHETHER THIS IS PIZZA
     * ============================================================
     */

    const isPizza =
      categoryName.trim().toLowerCase() === "pizza";

    /*
     * ============================================================
     * FETCH VARIANTS
     *
     * ALL VARIANTS COME FROM menu_variant.
     *
     * Pizza:
     *   is_pizza = 1
     *
     * Other categories:
     *   is_pizza = 0
     * ============================================================
     */

    let variantQuery;
    let variantParams;

    if (isPizza) {
      /*
       * Pizza variants
       *
       * Example:
       * 6"
       * 8"
       * 9"
       * 12"
       * 15"
       * 18"
       * 20"
       * 24"
       * 30"
       *
       * The quote (") is removed before converting
       * the value into a number for sorting.
       */

      variantQuery = `
        SELECT
          id,
          variant_name,
          is_pizza
        FROM menu_variant
        WHERE is_pizza = 1
        ORDER BY
          CAST(
            REPLACE(variant_name, '"', '')
            AS DECIMAL(10,2)
          ) ASC
      `;

      variantParams = [];
    } else {
      /*
       * Non-pizza variants
       *
       * Only fetch variants where is_pizza = 0.
       */

      variantQuery = `
  SELECT
    id,
    variant_name,
    is_pizza
  FROM menu_variant
  WHERE is_pizza = 0
  ORDER BY variant_name ASC
`;

variantParams = [];

variantParams = [];

      variantParams = [];
    }

    const [variants] = await db.query(
      variantQuery,
      variantParams,
    );

    /*
     * ============================================================
     * RESPONSE
     * ============================================================
     */

    return res.status(200).json({
      success: true,

      category: {
        id: subcategoryRows[0].menu_category_id,
        name: categoryName,
        restaurant_category_id:
          subcategoryRows[0].Restaurant_category_id,
      },

      isPizza,

      data: variants,
    });
  } catch (error) {
    console.error("Error fetching variants:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching variants.",
    });
  }
});

/**
 * ============================================================================
 * GET INGREDIENTS BY MENU ITEM
 * ============================================================================
 */
router.get("/ingredients", async (req, res) => {
  try {
    const { menu_subcategory_id } = req.query;

    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    if (!menu_subcategory_id) {
      return res.status(400).json({
        success: false,
        message: "Menu item ID is required.",
      });
    }

    const menuSubcategoryId = Number(menu_subcategory_id);

    if (!Number.isInteger(menuSubcategoryId) || menuSubcategoryId < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid menu item ID is required.",
      });
    }

    const placeholders = createPlaceholders(restaurantTypes);

    const [menuItemRows] = await db.query(
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
      [menuSubcategoryId, ...restaurantTypes],
    );

    if (menuItemRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Menu item not found or does not belong to your restaurant types.",
      });
    }

    const [ingredients] = await db.query(
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
      [menuSubcategoryId],
    );

    return res.status(200).json({
      success: true,
      menuItem: menuItemRows[0],
      data: ingredients,
    });
  } catch (error) {
    console.error("Error fetching ingredients:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching ingredients.",
    });
  }
});

/**
 * ============================================================================
 * GET PAGINATED LIST OF MENU PRICES
 * ============================================================================
 *
 * GET /api/menu-varient/list?page=1&limit=10
 * ============================================================================
 */
router.get("/list", async (req, res) => {
  try {
    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const placeholders = createPlaceholders(restaurantTypes);

    /* Total count */
    const [countRows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM menu_price mp

        INNER JOIN menu_subcategory ms
          ON ms.id = mp.menu_subcategory_id

        INNER JOIN menu_category mc
          ON mc.id = ms.menu_category_id

        WHERE mc.Restaurant_category_id IN (${placeholders})
      `,
      restaurantTypes,
    );

    const total = Number(countRows[0]?.total || 0);

    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    /* Data */
    const [rows] = await db.query(
      `
        SELECT
          mp.id,
          mp.menu_subcategory_id,
          ms.menu_name,
          ms.menu_category_id,
          mc.category_name,
          mp.variant_id,

          COALESCE(
            mv.variant_name,
            mvp.variant_name,
            'No Variant'
          ) AS variant_name,

          mp.cost,
          mp.price,
          mp.profit

        FROM menu_price mp

        INNER JOIN menu_subcategory ms
          ON ms.id = mp.menu_subcategory_id

        INNER JOIN menu_category mc
          ON mc.id = ms.menu_category_id

        LEFT JOIN menu_variant mv
          ON mv.id = mp.variant_id

        LEFT JOIN menu_variant_pizza mvp
          ON mvp.id = mp.variant_id

        WHERE mc.Restaurant_category_id IN (${placeholders})

        ORDER BY mp.id DESC

        LIMIT ? OFFSET ?
      `,
      [...restaurantTypes, limit, offset],
    );

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
    console.error("Error fetching menu price list:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching list.",
    });
  }
});

/**
 * ============================================================================
 * GET SINGLE MENU PRICE (with ingredients)
 * ============================================================================
 *
 * GET /api/menu-varient/:id
 * ============================================================================
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid ID is required.",
      });
    }

    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    const placeholders = createPlaceholders(restaurantTypes);

    const [rows] = await db.query(
      `
        SELECT
          mp.id,
          mp.menu_subcategory_id,
          ms.menu_name,
          ms.menu_category_id,
          mc.category_name,
          mp.variant_id,
          mp.cost,
          mp.price,
          mp.profit

        FROM menu_price mp

        INNER JOIN menu_subcategory ms
          ON ms.id = mp.menu_subcategory_id

        INNER JOIN menu_category mc
          ON mc.id = ms.menu_category_id

        WHERE mp.id = ?
          AND mc.Restaurant_category_id IN (${placeholders})

        LIMIT 1
      `,
      [id, ...restaurantTypes],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu price not found.",
      });
    }

    const [ingredientRows] = await db.query(
      `
        SELECT
          mpi.menu_ingredient_id AS ingredient_id,
          mpi.quantity
        FROM menu_price_ingredients mpi
        WHERE mpi.menu_price_id = ?
      `,
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...rows[0],
        ingredients: ingredientRows,
      },
    });
  } catch (error) {
    console.error("Error fetching single menu price:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching menu price.",
    });
  }
});

/**
 * ============================================================================
 * UPDATE MENU PRICE
 * ============================================================================
 *
 * PUT /api/menu-varient/:id
 * Body: { price, profit, ingredients: [{ ingredient_id, quantity }] }
 * ============================================================================
 */
router.put("/:id", async (req, res) => {
  let connection;

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid ID is required.",
      });
    }

    const { price, profit, ingredients } = req.body;

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      Number.isNaN(Number(price)) ||
      Number(price) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid selling price is required.",
      });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one ingredient is required.",
      });
    }

    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const placeholders = createPlaceholders(restaurantTypes);

    const [existingRows] = await connection.query(
      `
        SELECT mp.id
        FROM menu_price mp
        INNER JOIN menu_subcategory ms
          ON ms.id = mp.menu_subcategory_id
        INNER JOIN menu_category mc
          ON mc.id = ms.menu_category_id
        WHERE mp.id = ?
          AND mc.Restaurant_category_id IN (${placeholders})
        LIMIT 1
      `,
      [id, ...restaurantTypes],
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Menu price not found.",
      });
    }

    /* Recalculate total cost */
    let calculatedTotalCost = 0;

    for (const ing of ingredients) {
      const ingredientId = Number(ing.ingredient_id);
      const quantity = Number(ing.quantity);

      if (!Number.isInteger(ingredientId) || ingredientId < 1) {
        throw new Error("Invalid ingredient ID.");
      }

      if (Number.isNaN(quantity) || quantity <= 0) {
        throw new Error("Invalid ingredient quantity.");
      }

      const [costRows] = await connection.query(
        `
          SELECT cost_per_unit
          FROM menu_ingredients
          WHERE id = ?
          LIMIT 1
        `,
        [ingredientId],
      );

      if (costRows.length === 0) {
        throw new Error(`Ingredient ${ingredientId} not found.`);
      }

      const costPerUnit = Number(costRows[0].cost_per_unit || 0);

      calculatedTotalCost += costPerUnit * quantity;
    }

    const totalCostFormatted = Number(calculatedTotalCost.toFixed(2));
    const priceFormatted = Number(Number(price).toFixed(2));

    const calculatedProfit =
      profit !== undefined && profit !== null
        ? Number(Number(profit).toFixed(2))
        : Number((priceFormatted - totalCostFormatted).toFixed(2));

    await connection.query(
      `
        UPDATE menu_price
        SET cost = ?, price = ?, profit = ?
        WHERE id = ?
      `,
      [totalCostFormatted, priceFormatted, calculatedProfit, id],
    );

    /* Replace ingredients */
    await connection.query(
      `
        DELETE FROM menu_price_ingredients
        WHERE menu_price_id = ?
      `,
      [id],
    );

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
        [id, Number(ing.ingredient_id), Number(ing.quantity)],
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Menu price updated successfully.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Error updating menu price:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating menu price.",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * ============================================================================
 * DELETE MENU PRICE
 * ============================================================================
 *
 * DELETE /api/menu-varient/:id
 * ============================================================================
 */
router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid ID is required.",
      });
    }

    const restaurantTypes = await getRestaurantTypes(req);

    if (!restaurantTypes || restaurantTypes.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Restaurant types not found in cookie.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const placeholders = createPlaceholders(restaurantTypes);

    const [existingRows] = await connection.query(
      `
        SELECT mp.id
        FROM menu_price mp
        INNER JOIN menu_subcategory ms
          ON ms.id = mp.menu_subcategory_id
        INNER JOIN menu_category mc
          ON mc.id = ms.menu_category_id
        WHERE mp.id = ?
          AND mc.Restaurant_category_id IN (${placeholders})
        LIMIT 1
      `,
      [id, ...restaurantTypes],
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Menu price not found.",
      });
    }

    await connection.query(
      `
        DELETE FROM menu_price_ingredients
        WHERE menu_price_id = ?
      `,
      [id],
    );

    await connection.query(
      `
        DELETE FROM menu_price
        WHERE id = ?
      `,
      [id],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Menu price deleted successfully.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Error deleting menu price:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting menu price.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * ============================================================================
 * CREATE MENU PRICES & INGREDIENT MAPPINGS
 * ============================================================================
 */
router.post("/", async (req, res) => {
  let connection;

  try {
    let rawItems = [];

    if (Array.isArray(req.body)) {
      rawItems = req.body;
    } else if (req.body && Array.isArray(req.body.variants)) {
      const parentSubcategory = req.body.menu_subcategory_id;

      rawItems = req.body.variants.map((v) => ({
        ...v,
        menu_subcategory_id: v.menu_subcategory_id || parentSubcategory,
      }));
    } else if (req.body) {
      rawItems = [req.body];
    }

    if (rawItems.length === 0) {
      return res.status(400).json({
        message: "Payload cannot be empty.",
      });
    }

    const payloadItems = rawItems.map((item) => ({
      ...item,
      price:
        item.price !== undefined &&
        item.price !== null &&
        item.price !== ""
          ? item.price
          : item.sell_price,
    }));

    for (const item of payloadItems) {
      const { menu_subcategory_id, price, ingredients } = item;

      if (!menu_subcategory_id) {
        return res.status(400).json({
          message: "Menu item ID is required for all entries.",
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
          message: "A valid selling price is required for each variant.",
        });
      }

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          message:
            "At least one ingredient quantity is required per variant.",
        });
      }
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const createdRecords = [];

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
        variant_id !== undefined && variant_id !== null
          ? variant_id
          : varient_id !== undefined && varient_id !== null
            ? varient_id
            : null;

      let finalVariantId = null;

      if (selectedVariantId) {
        finalVariantId = Number(selectedVariantId);
      }

      let calculatedTotalCost = 0;

      for (const ing of ingredients) {
        const ingredientId = Number(ing.ingredient_id);
        const quantity = Number(ing.quantity);

        if (!Number.isInteger(ingredientId) || ingredientId < 1) {
          throw new Error("Invalid ingredient ID.");
        }

        if (Number.isNaN(quantity) || quantity <= 0) {
          throw new Error("Invalid ingredient quantity.");
        }

        const [costRows] = await connection.query(
          `
            SELECT cost_per_unit
            FROM menu_ingredients
            WHERE id = ?
            LIMIT 1
          `,
          [ingredientId],
        );

        if (costRows.length === 0) {
          throw new Error(`Ingredient ${ingredientId} not found.`);
        }

        const costPerUnit = Number(costRows[0].cost_per_unit || 0);

        calculatedTotalCost += costPerUnit * quantity;
      }

      const totalCostFormatted = Number(calculatedTotalCost.toFixed(2));
      const priceFormatted = Number(Number(price).toFixed(2));

      const calculatedProfit =
        profit !== undefined && profit !== null
          ? Number(Number(profit).toFixed(2))
          : Number((priceFormatted - totalCostFormatted).toFixed(2));

      const [priceResult] = await connection.query(
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
          Number(menu_subcategory_id),
          finalVariantId,
          totalCostFormatted,
          priceFormatted,
          calculatedProfit,
        ],
      );

      const menuPriceId = priceResult.insertId;

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
          [menuPriceId, Number(ing.ingredient_id), Number(ing.quantity)],
        );
      }

      createdRecords.push({
        menu_price_id: menuPriceId,
        menu_subcategory_id: Number(menu_subcategory_id),
        variant_id: finalVariantId,
        total_cost: totalCostFormatted,
        price: priceFormatted,
        profit: calculatedProfit,
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
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Error creating menu price and ingredients:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while saving menu prices and ingredients.",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;