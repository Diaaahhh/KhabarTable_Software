import express from "express";
import db from "../db.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| HELPER: GET RESTAURANT TYPE FROM COOKIE
|--------------------------------------------------------------------------
|
| Your cookie value can be:
|
| {"id":7,"company_id":445000,"company_name":"Dia Food Court",
| "restaurant_type":1,"email":"dia@gmail.com","role":3}
|
| We extract:
|
| restaurant_type = 1
|
|--------------------------------------------------------------------------
*/

const getRestaurantType = (req) => {
  try {
    /*
    |--------------------------------------------------------------
    | First check common cookie names
    |--------------------------------------------------------------
    */

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

      /*
      |------------------------------------------------------------
      | Decode URI encoded cookie
      |------------------------------------------------------------
      */

      try {
        parsedValue = decodeURIComponent(String(parsedValue));
      } catch {
        // Continue with original value
      }

      /*
      |------------------------------------------------------------
      | Try JSON parsing
      |------------------------------------------------------------
      */

      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // Not JSON
      }

      /*
      |------------------------------------------------------------
      | If object contains restaurant_type
      |------------------------------------------------------------
      */

      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        parsedValue.restaurant_type !== undefined
      ) {
        return Number(parsedValue.restaurant_type);
      }

      /*
      |------------------------------------------------------------
      | If cookie itself is restaurant_type
      |------------------------------------------------------------
      */

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

    /*
    |--------------------------------------------------------------
    | Last option: check every cookie
    |--------------------------------------------------------------
    */

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


/*
|--------------------------------------------------------------------------
| GET CATEGORIES
|--------------------------------------------------------------------------
|
| GET /api/menu-varient/categories
|
| Returns categories belonging to the logged-in restaurant type.
|
|--------------------------------------------------------------------------
*/

router.get("/categories", async (req, res) => {
  try {
    const restaurantType = getRestaurantType(req);

    console.log(
      "Cookies:",
      req.cookies
    );

    console.log(
      "Restaurant type:",
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

    return res.status(200).json({
      data: categories,
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


/*
|--------------------------------------------------------------------------
| GET MENU ITEMS BY CATEGORY
|--------------------------------------------------------------------------
|
| GET /api/menu-varient/menu-items?category_id=1
|
|--------------------------------------------------------------------------
*/

router.get("/menu-items", async (req, res) => {
  try {
    const { category_id } = req.query;

    if (!category_id) {
      return res.status(400).json({
        message: "Category ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------
    | Check category exists
    |--------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------
    | Get menu items
    |--------------------------------------------------------------
    */

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


/*
|--------------------------------------------------------------------------
| GET VARIANTS BY MENU ITEM
|--------------------------------------------------------------------------
|
| GET /api/menu-varient/variants?menu_subcategory_id=5
|
| Actual table:
|
| menu_variant
|
| Actual columns:
|
| id
| menu_subcategory_id
| variant_name
| price
|
|--------------------------------------------------------------------------
*/

router.get("/variants", async (req, res) => {
  try {
    const { menu_subcategory_id } = req.query;

    if (!menu_subcategory_id) {
      return res.status(400).json({
        message: "Menu item ID is required.",
      });
    }

    // Check that the selected menu item exists
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

    /*
     * menu_variant now contains only:
     *
     * id
     * variant_name
     *
     * Therefore we do NOT filter by menu_subcategory_id here.
     */

    const [variants] = await db.query(
      `
      SELECT
        id,
        variant_name
      FROM menu_variant
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


/*
|--------------------------------------------------------------------------
| GET INGREDIENTS BY MENU ITEM
|--------------------------------------------------------------------------
|
| GET /api/menu-varient/ingredients?menu_subcategory_id=5
|
| Tables used:
|
| menu_subcategory_ingredients
| menu_ingredients
|
| The relationship is:
|
| menu_subcategory
|       |
|       ↓
| menu_subcategory_ingredients
|       |
|       ↓
| menu_ingredients
|
|--------------------------------------------------------------------------
*/

router.get("/ingredients", async (req, res) => {
  try {
    const { menu_subcategory_id } = req.query;

    if (!menu_subcategory_id) {
      return res.status(400).json({
        message: "Menu item ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------
    | Check menu item
    |--------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------
    | Get ingredients
    |
    | unit_name is retrieved from the unit table.
    |
    | IMPORTANT:
    | The exact unit table name/column was not provided in the
    | schema you sent. Therefore this query currently returns
    | unit_id and cost_per_unit.
    |
    | We will add unit_name once the unit table structure is known.
    |--------------------------------------------------------------
    */

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
    console.error(
      "Error fetching ingredients:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching ingredients.",
    });
  }
});


/*
|--------------------------------------------------------------------------
| CREATE / UPDATE MENU VARIANT PRICE
|--------------------------------------------------------------------------
|
| POST /api/menu-varient
|
| Current frontend sends:
|
| {
|   menu_subcategory_id: 5,
|   varient_id: 2,
|   ingredients: [
|     {
|       ingredient_id: 1,
|       quantity: 2
|     }
|   ],
|   total_cost: 150,
|   price: 250
| }
|
| IMPORTANT:
|
| Your actual menu_variant table already contains:
|
| id
| menu_subcategory_id
| variant_name
| price
|
| So variant_id refers to an EXISTING variant.
|
| We therefore update its price.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CREATE MENU PRICE
|--------------------------------------------------------------------------
|
| POST /api/menu-varient
|
| Variant is OPTIONAL.
|
| menu_variant:
|   id
|   variant_name
|
| menu_price:
|   id
|   menu_subcategory_id
|   variant_id NULL
|   price
|
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      menu_subcategory_id,
      variant_id,
      varient_id,
      ingredients,
      price,
    } = req.body;

    /* ---------------------------------------------------------
       Validation
    --------------------------------------------------------- */

    if (!menu_subcategory_id) {
      return res.status(400).json({
        message: "Menu item is required.",
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
        message: "Valid selling price is required.",
      });
    }

    /* ---------------------------------------------------------
       Check menu item
    --------------------------------------------------------- */

    const [menuItemRows] = await db.query(
      `
      SELECT id
      FROM menu_subcategory
      WHERE id = ?
      LIMIT 1
      `,
      [Number(menu_subcategory_id)]
    );

    if (menuItemRows.length === 0) {
      return res.status(404).json({
        message: "Menu item not found.",
      });
    }

    /* ---------------------------------------------------------
       Normalize variant ID
    --------------------------------------------------------- */

    const selectedVariantId =
      variant_id !== undefined
        ? variant_id
        : varient_id !== undefined
          ? varient_id
          : null;

    let finalVariantId = null;

    /* ---------------------------------------------------------
       Validate variant
    --------------------------------------------------------- */

    if (
      selectedVariantId !== null &&
      selectedVariantId !== undefined &&
      selectedVariantId !== ""
    ) {
      if (
        Number.isNaN(Number(selectedVariantId)) ||
        Number(selectedVariantId) <= 0
      ) {
        return res.status(400).json({
          message: "Invalid variant selected.",
        });
      }

      const [variantRows] = await db.query(
        `
        SELECT id
        FROM menu_variant
        WHERE id = ?
        LIMIT 1
        `,
        [Number(selectedVariantId)]
      );

      if (variantRows.length === 0) {
        return res.status(400).json({
          message: "Selected variant does not exist.",
        });
      }

      finalVariantId = Number(selectedVariantId);
    }

    /* ---------------------------------------------------------
       Validate ingredients
    --------------------------------------------------------- */

    if (
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return res.status(400).json({
        message: "At least one ingredient is required.",
      });
    }

    /* ---------------------------------------------------------
       Validate ingredient IDs and quantities
    --------------------------------------------------------- */

    for (const item of ingredients) {
      if (
        !item.ingredient_id ||
        Number.isNaN(Number(item.ingredient_id))
      ) {
        return res.status(400).json({
          message: "Invalid ingredient selected.",
        });
      }

      if (
        item.quantity === undefined ||
        item.quantity === null ||
        item.quantity === "" ||
        Number.isNaN(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          message:
            "Every selected ingredient must have a valid quantity.",
        });
      }
    }

    /* ---------------------------------------------------------
       Verify ingredients belong to selected menu item
    --------------------------------------------------------- */

    for (const item of ingredients) {
      const [ingredientRows] = await db.query(
        `
        SELECT id
        FROM menu_subcategory_ingredients
        WHERE menu_subcategory_id = ?
          AND ingredient_id = ?
        LIMIT 1
        `,
        [
          Number(menu_subcategory_id),
          Number(item.ingredient_id),
        ]
      );

      if (ingredientRows.length === 0) {
        return res.status(400).json({
          message:
            `Ingredient ID ${item.ingredient_id} does not belong to this menu item.`,
        });
      }
    }

    /* ---------------------------------------------------------
       Calculate total ingredient cost
    --------------------------------------------------------- */

    let calculatedTotalCost = 0;

    for (const item of ingredients) {
      const [costRows] = await db.query(
        `
        SELECT cost_per_unit
        FROM menu_ingredients
        WHERE id = ?
        LIMIT 1
        `,
        [Number(item.ingredient_id)]
      );

      if (costRows.length === 0) {
        return res.status(400).json({
          message:
            `Ingredient ID ${item.ingredient_id} was not found.`,
        });
      }

      calculatedTotalCost +=
        Number(costRows[0].cost_per_unit || 0) *
        Number(item.quantity);
    }

    /* ---------------------------------------------------------
       START TRANSACTION
    --------------------------------------------------------- */

    connection = await db.getConnection();

    await connection.beginTransaction();

    /* ---------------------------------------------------------
       Insert into menu_price
    --------------------------------------------------------- */

    const [priceResult] = await connection.query(
      `
      INSERT INTO menu_price (
        menu_subcategory_id,
        variant_id,
        cost,
        price
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        Number(menu_subcategory_id),
        finalVariantId,
        Number(calculatedTotalCost.toFixed(2)),
        Number(price),
      ]
    );

    const menuPriceId = priceResult.insertId;

    /* ---------------------------------------------------------
       Insert ingredients into menu_price_ingredients
    --------------------------------------------------------- */

    for (const item of ingredients) {
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
          Number(item.ingredient_id),
          Number(item.quantity),
        ]
      );
    }

    /* ---------------------------------------------------------
       Commit transaction
    --------------------------------------------------------- */

    await connection.commit();

    /* ---------------------------------------------------------
       Success response
    --------------------------------------------------------- */

    return res.status(201).json({
      success: true,
      message: "Menu price and ingredients created successfully.",

      menu_price_id: menuPriceId,

      menu_subcategory_id:
        Number(menu_subcategory_id),

      variant_id: finalVariantId,

      total_cost:
        Number(calculatedTotalCost.toFixed(2)),

      price:
        Number(Number(price).toFixed(2)),
    });

  } catch (error) {

    /* ---------------------------------------------------------
       Rollback if something fails
    --------------------------------------------------------- */

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
        "Server error while saving menu price and ingredients.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });

  } finally {

    /* ---------------------------------------------------------
       Release database connection
    --------------------------------------------------------- */

    if (connection) {
      connection.release();
    }
  }
});


export default router;