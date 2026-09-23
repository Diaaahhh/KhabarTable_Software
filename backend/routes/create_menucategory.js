import express from "express";
import db from "../db.js";

const router = express.Router();

/*                                                                         |
| -------------------------------------------------------------------------- |
| GET /api/menu-categories                                                   |
| -------------------------------------------------------------------------- |
| Fetch all menu categories                                                  |
| */                                                                       
router.get("/", async (req, res) => {                                      
try {                                                                      


const [rows] = await db.execute(
  `
    SELECT
      id,
      category_name,
      Restaurant_category_id
    FROM menu_category
    ORDER BY id DESC
  `,
);

return res.status(200).json({
  success: true,
  data: rows,
});


} catch (error) {
console.error("Error fetching menu categories:", error);


return res.status(500).json({
  success: false,
  message: "Failed to fetch menu categories.",
});


}
});

/*                                                                         |
| -------------------------------------------------------------------------- |
| POST /api/menu-categories                                                  |
| -------------------------------------------------------------------------- |
| Create a new menu category                                                 |
|                                                                            |
| Request body:                                                              |
| {                                                                          |
| "category_name": "Breakfast",                                              |
| "Restaurant_category_id": 2                                                |
| }                                                                          |
| -------------------------------------------------------------------------- |
| */                                                                         
 router.post("/", async (req, res) => {                                     
 try {                                                                      


const { category_name, Restaurant_category_id } = req.body;

// ---------------------------------------------------------
// Validate menu category name
// ---------------------------------------------------------
if (
  !category_name ||
  typeof category_name !== "string" ||
  !category_name.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Menu category is required.",
  });
}

// ---------------------------------------------------------
// Validate restaurant category ID
// ---------------------------------------------------------
const restaurantCategoryId = Number(Restaurant_category_id);

if (
  !Number.isInteger(restaurantCategoryId) ||
  restaurantCategoryId < 1
) {
  return res.status(400).json({
    success: false,
    message: "Valid restaurant type is required.",
  });
}

const categoryName = category_name.trim();

// ---------------------------------------------------------
// Check if restaurant category exists
// ---------------------------------------------------------
const [restaurantCategoryRows] = await db.execute(
  `
    SELECT
      id,
      res_category
    FROM restaurant_category
    WHERE id = ?
    LIMIT 1
  `,
  [restaurantCategoryId],
);

if (restaurantCategoryRows.length === 0) {
  return res.status(400).json({
    success: false,
    message: "Selected restaurant type does not exist.",
  });
}

// ---------------------------------------------------------
// Check duplicate menu category for same restaurant type
// ---------------------------------------------------------
const [duplicateRows] = await db.execute(
  `
    SELECT id
    FROM menu_category
    WHERE category_name = ?
      AND Restaurant_category_id = ?
    LIMIT 1
  `,
  [categoryName, restaurantCategoryId],
);

if (duplicateRows.length > 0) {
  return res.status(409).json({
    success: false,
    message:
      "This menu category already exists for the selected restaurant type.",
  });
}

// ---------------------------------------------------------
// Insert menu category
// ---------------------------------------------------------
const [result] = await db.execute(
  `
    INSERT INTO menu_category
    (
      category_name,
      Restaurant_category_id
    )
    VALUES (?, ?)
  `,
  [categoryName, restaurantCategoryId],
);

// ---------------------------------------------------------
// Return created data
// ---------------------------------------------------------
return res.status(201).json({
  success: true,
  message: "Menu category created successfully.",
  data: {
    id: result.insertId,
    category_name: categoryName,
    Restaurant_category_id: restaurantCategoryId,
  },
});


} catch (error) {
console.error("Error creating menu category:", error);


return res.status(500).json({
  success: false,
  message: "Failed to create menu category.",
});


}
});

// --------------------------------------------------------------------------
// PUT /api/menu-categories/:id
// --------------------------------------------------------------------------
// Update an existing menu category
// --------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const menuCategoryId = Number(req.params.id);

    const { category_name, Restaurant_category_id } = req.body;

    // ---------------------------------------------------------
    // Validate menu category ID
    // ---------------------------------------------------------
    if (!Number.isInteger(menuCategoryId) || menuCategoryId < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid menu category ID is required.",
      });
    }

    // ---------------------------------------------------------
    // Validate menu category name
    // ---------------------------------------------------------
    if (
      !category_name ||
      typeof category_name !== "string" ||
      !category_name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Menu category is required.",
      });
    }

    // ---------------------------------------------------------
    // Validate restaurant category ID
    // ---------------------------------------------------------
    const restaurantCategoryId = Number(Restaurant_category_id);

    if (
      !Number.isInteger(restaurantCategoryId) ||
      restaurantCategoryId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid restaurant type is required.",
      });
    }

    const categoryName = category_name.trim();

    // ---------------------------------------------------------
    // Check if menu category exists
    // ---------------------------------------------------------
    const [existingRows] = await db.execute(
      `
        SELECT
          id,
          category_name,
          Restaurant_category_id
        FROM menu_category
        WHERE id = ?
        LIMIT 1
      `,
      [menuCategoryId],
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu category not found.",
      });
    }

    // ---------------------------------------------------------
    // Check if restaurant category exists
    // ---------------------------------------------------------
    const [restaurantCategoryRows] = await db.execute(
      `
        SELECT
          id,
          res_category
        FROM restaurant_category
        WHERE id = ?
        LIMIT 1
      `,
      [restaurantCategoryId],
    );

    if (restaurantCategoryRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected restaurant type does not exist.",
      });
    }

    // ---------------------------------------------------------
    // Check duplicate
    // Exclude the current menu category itself
    // ---------------------------------------------------------
    const [duplicateRows] = await db.execute(
      `
        SELECT id
        FROM menu_category
        WHERE category_name = ?
          AND Restaurant_category_id = ?
          AND id != ?
        LIMIT 1
      `,
      [categoryName, restaurantCategoryId, menuCategoryId],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This menu category already exists for the selected restaurant type.",
      });
    }

    // ---------------------------------------------------------
    // Update menu category
    // ---------------------------------------------------------
    await db.execute(
      `
        UPDATE menu_category
        SET
          category_name = ?,
          Restaurant_category_id = ?
        WHERE id = ?
      `,
      [categoryName, restaurantCategoryId, menuCategoryId],
    );

    // ---------------------------------------------------------
    // Return updated data
    // ---------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Menu category updated successfully.",
      data: {
        id: menuCategoryId,
        category_name: categoryName,
        Restaurant_category_id: restaurantCategoryId,
      },
    });
  } catch (error) {
    console.error("Error updating menu category:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update menu category.",
    });
  }
});

// --------------------------------------------------------------------------
// DELETE /api/menu-categories/:id
// --------------------------------------------------------------------------
// Delete an existing menu category
// --------------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const menuCategoryId = Number(req.params.id);

    // ---------------------------------------------------------
    // Validate ID
    // ---------------------------------------------------------
    if (!Number.isInteger(menuCategoryId) || menuCategoryId < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid menu category ID is required.",
      });
    }

    // ---------------------------------------------------------
    // Check if menu category exists
    // ---------------------------------------------------------
    const [existingRows] = await db.execute(
      `
        SELECT id, category_name
        FROM menu_category
        WHERE id = ?
        LIMIT 1
      `,
      [menuCategoryId],
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu category not found.",
      });
    }

    // ---------------------------------------------------------
    // Delete menu category
    // ---------------------------------------------------------
    await db.execute(
      `
        DELETE FROM menu_category
        WHERE id = ?
      `,
      [menuCategoryId],
    );

    return res.status(200).json({
      success: true,
      message: "Menu category deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting menu category:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete menu category.",
    });
  }
});

export default router;
