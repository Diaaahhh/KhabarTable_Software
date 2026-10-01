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
   These are the ONLY menus available for selection.
   ========================================================= */

const PACKAGE_MENU_IDS = [9, 11, 13, 14, 15, 17, 20];

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
   Fetch menus for package creation/editing
   ========================================================= */

router.get("/menus", async (req, res) => {
  try {
    const placeholders = PACKAGE_MENU_IDS
      .map(() => "?")
      .join(", ");

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
    console.error(
      "Error fetching package menus:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menus.",
    });
  }
});

/* =========================================================
   GET /api/packages
   Fetch packages with pagination
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

    /* =====================================================
       GET TOTAL PACKAGE COUNT
       ===================================================== */

    const [countRows] = await db.execute(
      `
        SELECT COUNT(*) AS total
        FROM user_package
        WHERE company_id = ?
      `,
      [companyId],
    );

    const total = Number(countRows[0]?.total || 0);

    const totalPages =
      total === 0
        ? 1
        : Math.ceil(total / limit);

    /* =====================================================
       GET PACKAGES
       ===================================================== */

    const [packages] = await db.execute(
      `
        SELECT
          id,
          package_name,
          created_at,
          updated_at
        FROM user_package
        WHERE company_id = ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `,
      [companyId, limit, offset],
    );

    /* =====================================================
       GET MENU NAMES FOR PACKAGES
       ===================================================== */

    if (packages.length > 0) {
      const packageIds = packages.map(
        (item) => item.id,
      );

      const placeholders = packageIds
        .map(() => "?")
        .join(", ");

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
    console.error(
      "Error fetching packages:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch packages.",
    });
  }
});

/* =========================================================
   POST /api/packages
   CREATE PACKAGE
   ========================================================= */

router.post("/", async (req, res) => {
  let connection;

  try {
    const {
      package_name: rawPackageName,
      menu_ids,
    } = req.body;

    /* =====================================================
       VALIDATE PACKAGE NAME
       ===================================================== */

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

    const packageName = capitalizeWords(
      rawPackageName.trim(),
    );

    /* =====================================================
       VALIDATE MENU IDS
       ===================================================== */

    if (
      !Array.isArray(menu_ids) ||
      menu_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one menu must be selected.",
      });
    }

    const menuIds = [
      ...new Set(
        menu_ids
          .map(Number)
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0,
          ),
      ),
    ];

    if (menuIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu selection.",
      });
    }

    /* =====================================================
       CHECK ALLOWED MENU IDS
       ===================================================== */

    const invalidMenuIds = menuIds.filter(
      (id) => !PACKAGE_MENU_IDS.includes(id),
    );

    if (invalidMenuIds.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected menus are not allowed.",
      });
    }

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(
      authUser.company_id,
    );

    const createdBy = Number(authUser.id);

    if (
      !Number.isInteger(companyId) ||
      companyId < 1
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Company authentication required.",
      });
    }

    if (
      !Number.isInteger(createdBy) ||
      createdBy < 1
    ) {
      return res.status(401).json({
        success: false,
        message:
          "User authentication required.",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    /* =====================================================
       CHECK DUPLICATE PACKAGE
       ===================================================== */

    const [duplicateRows] =
      await connection.execute(
        `
          SELECT id
          FROM user_package
          WHERE company_id = ?
            AND LOWER(TRIM(package_name)) =
                LOWER(TRIM(?))
          LIMIT 1
        `,
        [companyId, packageName],
      );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "A package with this name already exists.",
      });
    }

    /* =====================================================
       FETCH SELECTED MENUS
       ===================================================== */

    const placeholders = menuIds
      .map(() => "?")
      .join(", ");

    const [selectedMenus] =
      await connection.execute(
        `
          SELECT
            id,
            parent_id,
            menu
          FROM user_menu
          WHERE id IN (${placeholders})
        `,
        menuIds,
      );

    if (
      selectedMenus.length !== menuIds.length
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "One or more selected menus do not exist.",
      });
    }

    /* =====================================================
       ADD PARENT MENUS
       ===================================================== */

    const allMenuIds = new Set(menuIds);

    for (const selectedMenu of selectedMenus) {
      if (
        selectedMenu.parent_id !== null &&
        selectedMenu.parent_id !== undefined
      ) {
        allMenuIds.add(
          Number(selectedMenu.parent_id),
        );
      }
    }

    const finalMenuIds = [...allMenuIds];

    /* =====================================================
       VERIFY PARENT MENUS
       ===================================================== */

    if (
      finalMenuIds.length >
      menuIds.length
    ) {
      const parentIds =
        finalMenuIds.filter(
          (id) => !menuIds.includes(id),
        );

      const parentPlaceholders =
        parentIds
          .map(() => "?")
          .join(", ");

      const [parentRows] =
        await connection.execute(
          `
            SELECT id
            FROM user_menu
            WHERE id IN (${parentPlaceholders})
          `,
          parentIds,
        );

      if (
        parentRows.length !==
        parentIds.length
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "A parent menu for one of the selected menus was not found.",
        });
      }
    }

    /* =====================================================
       CREATE PACKAGE
       ===================================================== */

    const [packageResult] =
      await connection.execute(
        `
          INSERT INTO user_package
          (
            company_id,
            package_name,
            created_by
          )
          VALUES (?, ?, ?)
        `,
        [
          companyId,
          packageName,
          createdBy,
        ],
      );

    const packageId =
      packageResult.insertId;

    /* =====================================================
       INSERT PACKAGE MENUS
       ===================================================== */

    const packageMenuValues =
      finalMenuIds.map(
        (menuId) => [
          packageId,
          menuId,
        ],
      );

    const packageMenuPlaceholders =
      packageMenuValues
        .map(() => "(?, ?)")
        .join(", ");

    const packageMenuParams =
      packageMenuValues.flat();

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
      message:
        "Package created successfully.",
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

    console.error(
      "Error creating package:",
      error,
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "This package or package menu already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create package.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* =========================================================
   PUT /api/packages/:id
   UPDATE PACKAGE
   ========================================================= */

router.put("/:id", async (req, res) => {
  let connection;

  try {
    const packageId = Number(req.params.id);

    if (
      !Number.isInteger(packageId) ||
      packageId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    const {
      package_name: rawPackageName,
      menu_ids,
    } = req.body;

    /* =====================================================
       VALIDATE NAME
       ===================================================== */

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

    const packageName = capitalizeWords(
      rawPackageName.trim(),
    );

    /* =====================================================
       VALIDATE MENUS
       ===================================================== */

    if (
      !Array.isArray(menu_ids) ||
      menu_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one menu must be selected.",
      });
    }

    const menuIds = [
      ...new Set(
        menu_ids
          .map(Number)
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0,
          ),
      ),
    ];

    const invalidMenuIds = menuIds.filter(
      (id) => !PACKAGE_MENU_IDS.includes(id),
    );

    if (invalidMenuIds.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected menus are not allowed.",
      });
    }

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const authUser = getAuthUser(req);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = Number(
      authUser.company_id,
    );

    if (
      !Number.isInteger(companyId) ||
      companyId < 1
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Company authentication required.",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    /* =====================================================
       CHECK PACKAGE BELONGS TO COMPANY
       ===================================================== */

    const [packageRows] =
      await connection.execute(
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

    /* =====================================================
       CHECK DUPLICATE PACKAGE NAME
       ===================================================== */

    const [duplicateRows] =
      await connection.execute(
        `
          SELECT id
          FROM user_package
          WHERE company_id = ?
            AND id != ?
            AND LOWER(TRIM(package_name)) =
                LOWER(TRIM(?))
          LIMIT 1
        `,
        [
          companyId,
          packageId,
          packageName,
        ],
      );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "A package with this name already exists.",
      });
    }

    /* =====================================================
       FETCH SELECTED MENUS
       ===================================================== */

    const placeholders = menuIds
      .map(() => "?")
      .join(", ");

    const [selectedMenus] =
      await connection.execute(
        `
          SELECT
            id,
            parent_id
          FROM user_menu
          WHERE id IN (${placeholders})
        `,
        menuIds,
      );

    if (
      selectedMenus.length !== menuIds.length
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "One or more selected menus do not exist.",
      });
    }

    /* =====================================================
       ADD PARENT MENUS
       ===================================================== */

    const allMenuIds = new Set(menuIds);

    for (const selectedMenu of selectedMenus) {
      if (
        selectedMenu.parent_id !== null &&
        selectedMenu.parent_id !== undefined
      ) {
        allMenuIds.add(
          Number(selectedMenu.parent_id),
        );
      }
    }

    const finalMenuIds = [...allMenuIds];

    /* =====================================================
       UPDATE PACKAGE
       ===================================================== */

    await connection.execute(
      `
        UPDATE user_package
        SET
          package_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND company_id = ?
      `,
      [
        packageName,
        packageId,
        companyId,
      ],
    );

    /* =====================================================
       REMOVE OLD MENU RELATIONS
       ===================================================== */

    await connection.execute(
      `
        DELETE FROM package_menu
        WHERE package_id = ?
      `,
      [packageId],
    );

    /* =====================================================
       INSERT NEW MENU RELATIONS
       ===================================================== */

    const packageMenuValues =
      finalMenuIds.map(
        (menuId) => [
          packageId,
          menuId,
        ],
      );

    const packageMenuPlaceholders =
      packageMenuValues
        .map(() => "(?, ?)")
        .join(", ");

    const packageMenuParams =
      packageMenuValues.flat();

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
      message:
        "Package updated successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Error updating package:",
      error,
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "This package or package menu already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update package.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* =========================================================
   DELETE /api/packages/:id
   DELETE PACKAGE
   ========================================================= */

router.delete("/:id", async (req, res) => {
  let connection;

  try {
    const packageId = Number(req.params.id);

    if (
      !Number.isInteger(packageId) ||
      packageId < 1
    ) {
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

    const companyId = Number(
      authUser.company_id,
    );

    if (
      !Number.isInteger(companyId) ||
      companyId < 1
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Company authentication required.",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    /* =====================================================
       CHECK PACKAGE
       ===================================================== */

    const [packageRows] =
      await connection.execute(
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

    /* =====================================================
       DELETE PACKAGE MENUS
       ===================================================== */

    await connection.execute(
      `
        DELETE FROM package_menu
        WHERE package_id = ?
      `,
      [packageId],
    );

    /* =====================================================
       DELETE PACKAGE
       ===================================================== */

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
      message:
        "Package deleted successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(
      "Error deleting package:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete package.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;