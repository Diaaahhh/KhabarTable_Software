import express from "express";
import db from "../db.js";

const router = express.Router();

/* =========================================================
   FORMAT PACKAGE NAME
   ========================================================= */

const capitalizeWords = (value) => {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/* =========================================================
   PACKAGE MENU IDS
   ========================================================= */

const PACKAGE_MENU_IDS = [9, 11, 13, 14, 15, 17, 20, 21];

/* =========================================================
   GET AUTHENTICATED USER
   ========================================================= */

const getAuthUser = (req) => {
  const authCookie = req.cookies?.auth;

  if (!authCookie) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(authCookie));
  } catch (error) {
    console.error("Error parsing auth cookie:", error);
    return null;
  }
};

/* =========================================================
   GET /api/packages/menus
   ========================================================= */

router.get("/menus", async (req, res) => {
  try {
    const placeholders = PACKAGE_MENU_IDS.map(() => "?").join(", ");

    const [rows] = await db.execute(
      `
        SELECT
          id,
          parent_id,
          menu
        FROM user_menu
        WHERE id IN (${placeholders})
        ORDER BY id ASC
      `,
      PACKAGE_MENU_IDS,
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching package menus:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menus.",
    });
  }
});

/* =========================================================
   GET /api/packages/employees
   Employees are sorted alphabetically by first_name.
   ========================================================= */

router.get("/employees", async (req, res) => {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    const [rows] = await db.execute(
      `
        SELECT
          id,
          public_id,
          first_name,
          personal_email,
          package_id
        FROM employees_employee
        WHERE company_id = ?
        ORDER BY first_name ASC, id ASC
      `,
      [companyId],
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(
      "Error fetching employees for package assignment:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees.",
    });
  }
});

/* =========================================================
   GET /api/packages/assignment-list
   Sorted alphabetically by employee_name.
   Supports pagination.
   ========================================================= */

router.get("/assignment-list", async (req, res) => {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 10,
        1,
      ),
      100,
    );

    const offset = (page - 1) * limit;

    const [countRows] = await db.execute(
      `
        SELECT COUNT(*) AS total
        FROM employees_employee e
        INNER JOIN user_package p
          ON p.id = e.package_id
        WHERE e.company_id = ?
          AND p.company_id = ?
      `,
      [companyId, companyId],
    );

    const total = Number(countRows[0]?.total || 0);

    const totalPages =
      total === 0 ? 1 : Math.ceil(total / limit);

    const [rows] = await db.execute(
      `
        SELECT
          e.id AS id,
          e.id AS employee_id,
          e.public_id AS employee_code,
          e.first_name AS employee_name,
          e.package_id,
          p.package_name
        FROM employees_employee e
        INNER JOIN user_package p
          ON p.id = e.package_id
        WHERE e.company_id = ?
          AND p.company_id = ?
        ORDER BY e.first_name ASC, e.id ASC
        LIMIT ? OFFSET ?
      `,
      [companyId, companyId, limit, offset],
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
    console.error(
      "Error fetching package assignments:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch package assignments.",
    });
  }
});

/* =========================================================
   POST /api/packages/assign
   ========================================================= */

router.post("/assign", async (req, res) => {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    const employeeId = Number(req.body.employee_id);
    const packageId = Number(req.body.package_id);

    if (!Number.isInteger(employeeId) || employeeId < 1) {
      return res.status(400).json({
        success: false,
        message: "Please choose an employee.",
      });
    }

    if (!Number.isInteger(packageId) || packageId < 1) {
      return res.status(400).json({
        success: false,
        message: "Please choose a package.",
      });
    }

    const [employeeRows] = await db.execute(
      `
        SELECT
          id,
          company_id,
          package_id
        FROM employees_employee
        WHERE id = ?
          AND company_id = ?
        LIMIT 1
      `,
      [employeeId, companyId],
    );

    if (employeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found for your company.",
      });
    }

    if (
      employeeRows[0].package_id !== null &&
      employeeRows[0].package_id !== undefined
    ) {
      return res.status(409).json({
        success: false,
        message: "This employee already has a package assigned.",
      });
    }

    const [packageRows] = await db.execute(
      `
        SELECT
          id,
          company_id,
          package_name
        FROM user_package
        WHERE id = ?
          AND company_id = ?
        LIMIT 1
      `,
      [packageId, companyId],
    );

    if (packageRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Package not found for your company.",
      });
    }

    await db.execute(
      `
        UPDATE employees_employee
        SET
          package_id = ?,
          updated_by_id = ?
        WHERE id = ?
          AND company_id = ?
      `,
      [packageId, Number(authUser.id), employeeId, companyId],
    );

    return res.status(200).json({
      success: true,
      message: "Package assigned successfully.",
      data: {
        employee_id: employeeId,
        package_id: packageId,
        package_name: packageRows[0].package_name,
      },
    });
  } catch (error) {
    console.error("Error assigning package:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign package.",
    });
  }
});

/* =========================================================
   POST /api/packages/unassign
   ========================================================= */

router.post("/unassign", async (req, res) => {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    const employeeId = Number(req.body.employee_id);

    if (!Number.isInteger(employeeId) || employeeId < 1) {
      return res.status(400).json({
        success: false,
        message: "Please choose an employee.",
      });
    }

    const [employeeRows] = await db.execute(
      `
        SELECT id
        FROM employees_employee
        WHERE id = ?
          AND company_id = ?
        LIMIT 1
      `,
      [employeeId, companyId],
    );

    if (employeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found for your company.",
      });
    }

    await db.execute(
      `
        UPDATE employees_employee
        SET
          package_id = NULL,
          updated_by_id = ?
        WHERE id = ?
          AND company_id = ?
      `,
      [Number(authUser.id), employeeId, companyId],
    );

    return res.status(200).json({
      success: true,
      message: "Package assignment removed successfully.",
    });
  } catch (error) {
    console.error("Error unassigning package:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove package assignment.",
    });
  }
});

/* =========================================================
   POST /api/packages/check-duplicate
   ========================================================= */

router.post("/check-duplicate", async (req, res) => {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    const employeeId = Number(req.body.employee_id);

    if (!Number.isInteger(employeeId) || employeeId < 1) {
      return res.status(200).json({
        success: true,
        exists: false,
      });
    }

    const [rows] = await db.execute(
      `
        SELECT id
        FROM employees_employee
        WHERE id = ?
          AND company_id = ?
          AND package_id IS NOT NULL
        LIMIT 1
      `,
      [employeeId, companyId],
    );

    return res.status(200).json({
      success: true,
      exists: rows.length > 0,
    });
  } catch (error) {
    console.error("Error checking duplicate assignment:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check duplicate.",
    });
  }
});

/* =========================================================
   GET /api/packages
   Supports:
     ?page=1&limit=10       (pagination)
     ?sort=name              (alphabetical sort by package_name)
   Default sort: id DESC   (newest first)
   ========================================================= */

router.get("/", async (req, res) => {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const sortParam = String(req.query.sort || "").toLowerCase();

    const orderBy =
      sortParam === "name"
        ? "package_name ASC, id ASC"
        : "id DESC";

    const [countRows] = await db.execute(
      `
        SELECT COUNT(*) AS total
        FROM user_package
        WHERE company_id = ?
      `,
      [companyId],
    );

    const total = Number(countRows[0]?.total || 0);
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    const [packages] = await db.execute(
      `
        SELECT
          id,
          package_name,
          created_at,
          updated_at
        FROM user_package
        WHERE company_id = ?
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
      [companyId, limit, offset],
    );

    if (packages.length > 0) {
      const packageIds = packages.map((item) => item.id);
      const placeholders = packageIds.map(() => "?").join(", ");

      const [menuRows] = await db.execute(
        `
          SELECT
            pm.package_id,
            pm.menu_id,
            um.menu,
            um.parent_id
          FROM package_menu pm
          INNER JOIN user_menu um
            ON um.id = pm.menu_id
          WHERE pm.package_id IN (${placeholders})
          ORDER BY pm.package_id, pm.menu_id
        `,
        packageIds,
      );

      const menuMap = {};

      for (const row of menuRows) {
        if (!menuMap[row.package_id]) {
          menuMap[row.package_id] = [];
        }

        menuMap[row.package_id].push({
          id: row.menu_id,
          menu: row.menu,
          parent_id: row.parent_id,
        });
      }

      packages.forEach((item) => {
        item.menus = menuMap[item.id] || [];
      });
    } else {
      packages.forEach((item) => {
        item.menus = [];
      });
    }

    return res.status(200).json({
      success: true,
      data: packages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching packages:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch packages.",
    });
  }
});

/* =========================================================
   POST /api/packages
   ========================================================= */

router.post("/", async (req, res) => {
  let connection;

  try {
    const { package_name: rawPackageName, menu_ids } = req.body;

    if (
      !rawPackageName ||
      typeof rawPackageName !== "string" ||
      !rawPackageName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Package name is required.",
      });
    }

    const packageName = capitalizeWords(rawPackageName.trim());

    if (!Array.isArray(menu_ids) || menu_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one menu must be selected.",
      });
    }

    const menuIds = [
      ...new Set(
        menu_ids
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    if (menuIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu selection.",
      });
    }

    const invalidMenuIds = menuIds.filter(
      (id) => !PACKAGE_MENU_IDS.includes(id),
    );

    if (invalidMenuIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more selected menus are not allowed.",
      });
    }

    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);
    const createdBy = Number(authUser.id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    if (!Number.isInteger(createdBy) || createdBy < 1) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [duplicateRows] = await connection.execute(
      `
        SELECT id
        FROM user_package
        WHERE company_id = ?
          AND LOWER(TRIM(package_name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [companyId, packageName],
    );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "A package with this name already exists.",
      });
    }

    const placeholders = menuIds.map(() => "?").join(", ");

    const [selectedMenus] = await connection.execute(
      `
        SELECT id, parent_id, menu
        FROM user_menu
        WHERE id IN (${placeholders})
      `,
      menuIds,
    );

    if (selectedMenus.length !== menuIds.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "One or more selected menus do not exist.",
      });
    }

    const allMenuIds = new Set(menuIds);

    for (const selectedMenu of selectedMenus) {
      if (
        selectedMenu.parent_id !== null &&
        selectedMenu.parent_id !== undefined
      ) {
        allMenuIds.add(Number(selectedMenu.parent_id));
      }
    }

    const finalMenuIds = [...allMenuIds];

    const [packageResult] = await connection.execute(
      `
        INSERT INTO user_package
        (
          company_id,
          package_name,
          created_by
        )
        VALUES (?, ?, ?)
      `,
      [companyId, packageName, createdBy],
    );

    const packageId = packageResult.insertId;

    const packageMenuValues = finalMenuIds.map((menuId) => [packageId, menuId]);
    const packageMenuPlaceholders = packageMenuValues
      .map(() => "(?, ?)")
      .join(", ");
    const packageMenuParams = packageMenuValues.flat();

    await connection.execute(
      `
        INSERT INTO package_menu
        (
          package_id,
          menu_id
        )
        VALUES ${packageMenuPlaceholders}
      `,
      packageMenuParams,
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Package created successfully.",
      data: {
        id: packageId,
        company_id: companyId,
        package_name: packageName,
        menu_ids: finalMenuIds,
        created_by: createdBy,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Error creating package:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This package or package menu already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create package.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* =========================================================
   PUT /api/packages/:id
   ========================================================= */

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const packageId = Number(req.params.id);

    if (!Number.isInteger(packageId) || packageId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    const { package_name: rawPackageName, menu_ids } = req.body;

    if (
      !rawPackageName ||
      typeof rawPackageName !== "string" ||
      !rawPackageName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Package name is required.",
      });
    }

    const packageName = capitalizeWords(rawPackageName.trim());

    if (!Array.isArray(menu_ids) || menu_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one menu must be selected.",
      });
    }

    const menuIds = [
      ...new Set(
        menu_ids
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    const invalidMenuIds = menuIds.filter(
      (id) => !PACKAGE_MENU_IDS.includes(id),
    );

    if (invalidMenuIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more selected menus are not allowed.",
      });
    }

    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [packageRows] = await connection.execute(
      `
        SELECT id
        FROM user_package
        WHERE id = ?
          AND company_id = ?
        LIMIT 1
      `,
      [packageId, companyId],
    );

    if (packageRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Package not found.",
      });
    }

    const [duplicateRows] = await connection.execute(
      `
        SELECT id
        FROM user_package
        WHERE company_id = ?
          AND id != ?
          AND LOWER(TRIM(package_name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [companyId, packageId, packageName],
    );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "A package with this name already exists.",
      });
    }

    const placeholders = menuIds.map(() => "?").join(", ");

    const [selectedMenus] = await connection.execute(
      `
        SELECT id, parent_id
        FROM user_menu
        WHERE id IN (${placeholders})
      `,
      menuIds,
    );

    if (selectedMenus.length !== menuIds.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "One or more selected menus do not exist.",
      });
    }

    const allMenuIds = new Set(menuIds);

    for (const selectedMenu of selectedMenus) {
      if (
        selectedMenu.parent_id !== null &&
        selectedMenu.parent_id !== undefined
      ) {
        allMenuIds.add(Number(selectedMenu.parent_id));
      }
    }

    const finalMenuIds = [...allMenuIds];

    await connection.execute(
      `
        UPDATE user_package
        SET
          package_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND company_id = ?
      `,
      [packageName, packageId, companyId],
    );

    await connection.execute(
      `
        DELETE FROM package_menu
        WHERE package_id = ?
      `,
      [packageId],
    );

    const packageMenuValues = finalMenuIds.map((menuId) => [packageId, menuId]);
    const packageMenuPlaceholders = packageMenuValues
      .map(() => "(?, ?)")
      .join(", ");
    const packageMenuParams = packageMenuValues.flat();

    await connection.execute(
      `
        INSERT INTO package_menu
        (
          package_id,
          menu_id
        )
        VALUES ${packageMenuPlaceholders}
      `,
      packageMenuParams,
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Package updated successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Error updating package:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update package.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* =========================================================
   DELETE /api/packages/:id
   ========================================================= */

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const packageId = Number(req.params.id);

    if (!Number.isInteger(packageId) || packageId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(authUser.company_id);

    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(401).json({
        success: false,
        message: "Company authentication required.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [packageRows] = await connection.execute(
      `
        SELECT id
        FROM user_package
        WHERE id = ?
          AND company_id = ?
        LIMIT 1
      `,
      [packageId, companyId],
    );

    if (packageRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Package not found.",
      });
    }

    await connection.execute(
      `
        DELETE FROM package_menu
        WHERE package_id = ?
      `,
      [packageId],
    );

    await connection.execute(
      `
        UPDATE employees_employee
        SET package_id = NULL
        WHERE package_id = ?
          AND company_id = ?
      `,
      [packageId, companyId],
    );

    await connection.execute(
      `
        DELETE FROM user_package
        WHERE id = ?
          AND company_id = ?
      `,
      [packageId, companyId],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Package deleted successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Error deleting package:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete package.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;