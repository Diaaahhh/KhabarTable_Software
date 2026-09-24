import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 *|--------------------------------------------------------------------------
 *| HELPER: GET RESTAURANT TYPE FROM COOKIE
 *|--------------------------------------------------------------------------
 */
const getRestaurantType = (req) => {
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

    for (const cookieValue of possibleCookies) {
      if (!cookieValue) continue;

      let parsedValue = cookieValue;

      try {
        parsedValue = decodeURIComponent(String(parsedValue));
      } catch {
        // Continue with original value
      }

      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // Not JSON
      }

      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        parsedValue.restaurant_type !== undefined
      ) {
        return Number(parsedValue.restaurant_type);
      }

      if (
        typeof parsedValue === "string" ||
        typeof parsedValue === "number"
      ) {
        const numberValue = Number(parsedValue);

        if (!Number.isNaN(numberValue)) {
          return numberValue;
        }
      }
    }

    for (const cookieValue of Object.values(cookies)) {
      if (!cookieValue) continue;

      let parsedValue = cookieValue;

      try {
        parsedValue = decodeURIComponent(String(parsedValue));
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
        parsedValue.restaurant_type !== undefined
      ) {
        return Number(parsedValue.restaurant_type);
      }
    }

    return null;
  } catch (error) {
    console.error("Error reading restaurant type:", error);
    return null;
  }
};

/**
 *|--------------------------------------------------------------------------
 *| GET CATEGORIES
 *|--------------------------------------------------------------------------
 *| GET /api/menu-varient/categories
 */
router.get("/categories", async (req, res) => {
  try {
    const restaurantType = getRestaurantType(req);

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

    return res.status(200).json({
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching menu categories:", error);

    return res.status(500).json({
      message: "Server error while fetching categories.",
    });
  }
});

/**
 *|--------------------------------------------------------------------------
 *| GET MENU ITEMS BY CATEGORY
 *|--------------------------------------------------------------------------
 *| GET /api/menu-varient/menu-items?category_id=1
 */
router.get("/menu-items", async (req, res) => {
  try {
    const { category_id } = req.query;

    if (!category_id) {
      return res.status(400).json({
        message: "Category ID is required.",
      });
    }

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
      [category_id]
    );

    return res.status(200).json({
      data: menuItems,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);

    return res.status(500).json({
      message: "Server error while fetching menu items.",
    });
  }
});

/**
 *|--------------------------------------------------------------------------
 *| GET VARIANTS BY MENU ITEM
 *|--------------------------------------------------------------------------
 *| GET /api/menu-varient/variants?menu_subcategory_id=5
 */
/**
 * GET VARIANTS BY MENU ITEM & CATEGORY
 * GET /api/menu-varient/variants?menu_subcategory_id=5&category_id=1
 */
router.get("/variants", async (req, res) => {
  try {
    const { menu_subcategory_id, category_id } = req.query;

    if (!menu_subcategory_id) {
      return res.status(400).json({
        message: "Menu item ID is required.",
      });
    }

    // Check category name to determine table
    let categoryName = "";

    if (category_id) {
      const [categoryRows] = await db.query(
        `SELECT category_name FROM menu_category WHERE id = ? LIMIT 1`,
        [category_id]
      );
      if (categoryRows.length > 0) {
        categoryName = categoryRows[0].category_name;
      }
    } else {
      // Fallback: look up category name via subcategory
      const [subcategoryRows] = await db.query(
        `
        SELECT mc.category_name 
        FROM menu_subcategory ms
        JOIN menu_category mc ON ms.menu_category_id = mc.id
        WHERE ms.id = ?
        LIMIT 1
        `,
        [menu_subcategory_id]
      );
      if (subcategoryRows.length > 0) {
        categoryName = subcategoryRows[0].category_name;
      }
    }

    // Determine target table dynamically
    const variantTable =
      categoryName.trim().toLowerCase() === "pizza"
        ? "menu_variant_pizza"
        : "menu_variant";

    const [variants] = await db.query(
      `
      SELECT
        id,
        variant_name
      FROM ${variantTable}
      ORDER BY variant_name ASC
      `
    );

    return res.status(200).json({
      data: variants,
    });
  } catch (error) {
    console.error("Error fetching variants:", error);

    return res.status(500).json({
      message: "Server error while fetching variants.",
    });
  }
});

/**
 *|--------------------------------------------------------------------------
 *| GET INGREDIENTS BY MENU ITEM
 *|--------------------------------------------------------------------------
 *| GET /api/menu-varient/ingredients?menu_subcategory_id=5
 */
router.get("/ingredients", async (req, res) => {
  try {
    const { menu_subcategory_id } = req.query;

    if (!menu_subcategory_id) {
      return res.status(400).json({
        message: "Menu item ID is required.",
      });
    }

    const [menuItemRows] = await db.query(
      `
      SELECT id
      FROM menu_subcategory
      WHERE id = ?
      LIMIT 1
      `,
      [menu_subcategory_id]
    );

    if (menuItemRows.length === 0) {
      return res.status(404).json({
        message: "Menu item not found.",
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
      [menu_subcategory_id]
    );

    return res.status(200).json({
      data: ingredients,
    });
  } catch (error) {
    console.error("Error fetching ingredients:", error);

    return res.status(500).json({
      message: "Server error while fetching ingredients.",
    });
  }
});

/**
 *|--------------------------------------------------------------------------
 *| CREATE MENU PRICES & INGREDIENT MAPPINGS
 *|--------------------------------------------------------------------------
 *| POST /api/menu-varient
 *|
 *| Supports both single item payloads and multi-variant bulk array payloads
 *| from the React frontend.
 *|--------------------------------------------------------------------------
 */
// Replace section 1 & 2 in router.post("/") inside variant.js
/**
 *|--------------------------------------------------------------------------
 *| CREATE MENU PRICES & INGREDIENT MAPPINGS
 *|--------------------------------------------------------------------------
 *| POST /api/menu-varient
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

    // Normalize price / sell_price across all items
    const payloadItems = rawItems.map((item) => ({
      ...item,
      price:
        item.price !== undefined && item.price !== null && item.price !== ""
          ? item.price
          : item.sell_price,
    }));

    /* ---------------------------------------------------------
       1. Global Validation
    --------------------------------------------------------- */
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
          message: "At least one ingredient quantity is required per variant.",
        });
      }
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const createdRecords = [];

    /* ---------------------------------------------------------
       2. Process each variant entry
    --------------------------------------------------------- */
    for (const item of payloadItems) {
      const {
        menu_subcategory_id,
        variant_id,
        varient_id,
        ingredients,
        price,
        profit, // Received from frontend payload (optional)
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

      // Calculate total ingredient costs dynamically
      let calculatedTotalCost = 0;

      for (const ing of ingredients) {
        const [costRows] = await connection.query(
          `
          SELECT cost_per_unit
          FROM menu_ingredients
          WHERE id = ?
          LIMIT 1
          `,
          [Number(ing.ingredient_id)]
        );

        const costPerUnit =
          costRows.length > 0 ? Number(costRows[0].cost_per_unit || 0) : 0;
        calculatedTotalCost += costPerUnit * Number(ing.quantity);
      }

      const totalCostFormatted = Number(calculatedTotalCost.toFixed(2));
      const priceFormatted = Number(Number(price).toFixed(2));

      // Calculate profit server-side (or fallback to payload profit if present)
      const calculatedProfit =
        profit !== undefined && profit !== null
          ? Number(Number(profit).toFixed(2))
          : Number((priceFormatted - totalCostFormatted).toFixed(2));

      // Insert menu price row including profit
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
        ]
      );

      const menuPriceId = priceResult.insertId;

      // Insert mapping rows into menu_price_ingredients
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
          [menuPriceId, Number(ing.ingredient_id), Number(ing.quantity)]
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
      message: "Menu prices and ingredient allocations created successfully.",
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