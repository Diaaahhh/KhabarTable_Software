import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../db.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Company Logo Upload Configuration
|--------------------------------------------------------------------------
*/

const uploadDirectory = path.join(process.cwd(), "uploads", "company");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024, // 50 KB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, WEBP and GIF images are allowed."),
      );
    }

    cb(null, true);
  },
});

/*
|--------------------------------------------------------------------------
| Generate Company ID
|--------------------------------------------------------------------------
*/

async function generateCompanyId(connection) {
  const [rows] = await connection.execute(
    `
      SELECT company_id
      FROM users
      WHERE company_id >= ?
        AND company_id <= ?
      ORDER BY company_id DESC
      LIMIT 1
    `,
    [445000, 445999],
  );

  let nextNumber = 445000;

  if (rows.length > 0 && rows[0].company_id) {
    const lastCompanyId = Number(rows[0].company_id);
    nextNumber = lastCompanyId + 1;
  }

  if (nextNumber > 445999) {
    throw new Error("Company ID limit reached.");
  }

  return nextNumber;
}

/*
|--------------------------------------------------------------------------
| Generate Software API Key
|--------------------------------------------------------------------------
*/

async function generateSoftwareApiKey(connection) {
  let apiKey;
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(
      1000000 + Math.random() * 9000000,
    );

    apiKey = `445${randomNumber}`;

    const [rows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE software_api_key = ?
        LIMIT 1
      `,
      [apiKey],
    );

    exists = rows.length > 0;
  }

  return apiKey;
}

/*
|--------------------------------------------------------------------------
| CHECK DUPLICATE EMAIL OR PHONE IN REALTIME
|--------------------------------------------------------------------------
| POST /api/registration/check-duplicate
|--------------------------------------------------------------------------
*/
router.post("/check-duplicate", async (req, res) => {
  try {
    const { field, value, companyId } = req.body;

    if (!field || !value) {
      return res.status(400).json({
        success: false,
        message: "Field and value are required.",
      });
    }

    if (field !== "email" && field !== "phone") {
      return res.status(400).json({
        success: false,
        message: "Invalid field requested.",
      });
    }

    const cleanValue = value.trim();
    if (!cleanValue) {
      return res.status(200).json({ exists: false });
    }

    let query = `SELECT id FROM users WHERE ${field} = ?`;
    const params = [cleanValue];

    if (companyId) {
      query += ` AND id != ?`;
      params.push(companyId);
    }

    query += ` LIMIT 1`;

    const [rows] = await db.execute(query, params);

    return res.status(200).json({
      exists: rows.length > 0,
      field,
    });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error checking duplicate value.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET DESIGNATIONS
|--------------------------------------------------------------------------
| GET /api/registration/designations
|--------------------------------------------------------------------------
*/
router.get("/designations", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
          id,
          code,
          name
        FROM organization_designation
        WHERE status = 'active'
        ORDER BY name ASC
      `,
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to fetch designations:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch designations.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET COMPANY BY ID  (used by the Edit form)
|--------------------------------------------------------------------------
| GET /api/registration/company/:id
|--------------------------------------------------------------------------
|
| Returns:
|   id, company_id, company_name, name, email, phone, designation,
|   branchCount, restaurant_type, address, logo
|
*/
router.get("/company/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid company ID is required.",
      });
    }

    const [rows] = await db.execute(
      `
        SELECT
          id,
          company_id,
          company_name,
          name,
          email,
          phone,
          designation,
          branchCount,
          branchCount_Remaining,
          restaurant_type,
          address,
          logo,
          expiry_date
        FROM users
        WHERE id = ?
          AND role = 3
        LIMIT 1
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch company:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE COMPANY  (used by the Edit form)
|--------------------------------------------------------------------------
| PUT /api/registration/company/:id
|--------------------------------------------------------------------------
|
| Body (JSON):
|   companyName, name, email, phone, address,
|   restaurantType, branchCount, designation
|
*/
router.put("/company/:id", async (req, res) => {
  let connection;

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid company ID is required.",
      });
    }

    const {
      companyName,
      name,
      email,
      phone,
      address,
      restaurantType,
      branchCount,
      designation,
    } = req.body;

    /* ---------------- Validate ---------------- */

    if (
      !companyName ||
      !name ||
      !email ||
      !phone ||
      !address ||
      !restaurantType ||
      branchCount === undefined ||
      branchCount === null ||
      branchCount === "" ||
      designation === undefined ||
      designation === null ||
      designation === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    const finalBranchCount = Number(branchCount);

    if (
      !Number.isInteger(finalBranchCount) ||
      finalBranchCount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Branch count must be a valid number.",
      });
    }

    const designationId = Number(designation);

    if (!Number.isInteger(designationId) || designationId < 1) {
      return res.status(400).json({
        success: false,
        message: "Designation is required.",
      });
    }

    /* ---------------- Restaurant types ---------------- */

    let restaurantTypeIds;

    try {
      restaurantTypeIds =
        typeof restaurantType === "string"
          ? JSON.parse(restaurantType)
          : restaurantType;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant type selection.",
      });
    }

    if (
      !Array.isArray(restaurantTypeIds) ||
      restaurantTypeIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one restaurant type.",
      });
    }

    restaurantTypeIds = restaurantTypeIds.map((item) => Number(item));

    const hasInvalidRestaurantType = restaurantTypeIds.some(
      (item) => !Number.isInteger(item) || item < 1,
    );

    if (hasInvalidRestaurantType) {
      return res.status(400).json({
        success: false,
        message: "One or more restaurant types are invalid.",
      });
    }

    restaurantTypeIds = [...new Set(restaurantTypeIds)];

    /* ---------------- Database ---------------- */

    connection = await db.getConnection();
    await connection.beginTransaction();

    /* ---------------- Ensure company exists ---------------- */

    const [existingRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE id = ?
          AND role = 3
        LIMIT 1
      `,
      [id],
    );

    if (existingRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    /* ---------------- Validate designation ---------------- */

    const [designationRows] = await connection.execute(
      `
        SELECT id
        FROM organization_designation
        WHERE id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [designationId],
    );

    if (designationRows.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Selected designation does not exist.",
      });
    }

    /* ---------------- Validate restaurant categories ---------------- */

    const placeholders = restaurantTypeIds.map(() => "?").join(", ");

    const [restaurantCategoryRows] = await connection.execute(
      `
        SELECT id
        FROM restaurant_category
        WHERE id IN (${placeholders})
      `,
      restaurantTypeIds,
    );

    const existingCategoryIds = restaurantCategoryRows.map((row) =>
      Number(row.id),
    );

    const invalidCategoryIds = restaurantTypeIds.filter(
      (item) => !existingCategoryIds.includes(item),
    );

    if (invalidCategoryIds.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "One or more selected restaurant types do not exist.",
        invalidRestaurantTypeIds: invalidCategoryIds,
      });
    }

    /* ---------------- Duplicate email / phone ---------------- */

    const [emailRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE email = ?
          AND id != ?
        LIMIT 1
      `,
      [email, id],
    );

    const emailExists = emailRows.length > 0;

    const [phoneRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE phone = ?
          AND id != ?
        LIMIT 1
      `,
      [phone, id],
    );

    const phoneExists = phoneRows.length > 0;

    if (emailExists && phoneExists) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        code: "EMAIL_PHONE_EXISTS",
        emailMessage: "This email address is already registered.",
        phoneMessage: "This phone number is already registered.",
      });
    }

    if (emailExists) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message: "This email address is already registered.",
      });
    }

    if (phoneExists) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        code: "PHONE_EXISTS",
        message: "This phone number is already registered.",
      });
    }

    /* ---------------- Update company ---------------- */

    await connection.execute(
      `
        UPDATE users
        SET
          company_name = ?,
          name = ?,
          email = ?,
          phone = ?,
          designation = ?,
          branchCount = ?,
          restaurant_type = ?,
          address = ?
        WHERE id = ?
          AND role = 3
      `,
      [
        companyName,
        name,
        email,
        phone,
        designationId,
        finalBranchCount,
        JSON.stringify(restaurantTypeIds),
        address,
        id,
      ],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Company updated successfully.",
    });
  } catch (error) {
    console.error("Company update error:", error);

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Company update failed.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/*
|--------------------------------------------------------------------------
| COMPANY REGISTRATION
|--------------------------------------------------------------------------
| POST /api/registration/company
|--------------------------------------------------------------------------
*/
router.post("/company", upload.single("logo"), async (req, res) => {
  let connection;

  try {
    const {
      companyName,
      name,
      email,
      phone,
      password,
      designation,
      address,
      restaurantType,
      branchCount,
    } = req.body;

    if (
      !companyName ||
      !name ||
      !email ||
      !phone ||
      !password ||
      !designation ||
      !address ||
      !restaurantType ||
      branchCount === undefined ||
      branchCount === null ||
      branchCount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    const finalBranchCount = Number(branchCount);

    if (
      !Number.isInteger(finalBranchCount) ||
      finalBranchCount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Branch count must be a valid number.",
      });
    }

    const designationId = Number(designation);

    if (!Number.isInteger(designationId) || designationId < 1) {
      return res.status(400).json({
        success: false,
        message: "Designation is required.",
      });
    }

    let logoPath = null;

    if (req.file) {
      logoPath = `/uploads/company/${req.file.filename}`;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    /* Designation check */
    const [designationRows] = await connection.execute(
      `
        SELECT id
        FROM organization_designation
        WHERE id = ?
          AND status = 'active'
        LIMIT 1
      `,
      [designationId],
    );

    if (designationRows.length === 0) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Selected designation does not exist.",
      });
    }

    /* Restaurant types */
    let restaurantTypeIds;

    try {
      restaurantTypeIds = JSON.parse(restaurantType);
    } catch (error) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Invalid restaurant type selection.",
      });
    }

    if (
      !Array.isArray(restaurantTypeIds) ||
      restaurantTypeIds.length === 0
    ) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Please select at least one restaurant type.",
      });
    }

    restaurantTypeIds = restaurantTypeIds.map((id) => Number(id));

    const hasInvalidRestaurantType = restaurantTypeIds.some(
      (id) => !Number.isInteger(id) || id < 1,
    );

    if (hasInvalidRestaurantType) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "One or more restaurant types are invalid.",
      });
    }

    restaurantTypeIds = [...new Set(restaurantTypeIds)];

    const placeholders = restaurantTypeIds.map(() => "?").join(", ");

    const [restaurantCategoryRows] = await connection.execute(
      `
        SELECT id
        FROM restaurant_category
        WHERE id IN (${placeholders})
      `,
      restaurantTypeIds,
    );

    const existingCategoryIds = restaurantCategoryRows.map((row) =>
      Number(row.id),
    );

    const invalidCategoryIds = restaurantTypeIds.filter(
      (id) => !existingCategoryIds.includes(id),
    );

    if (invalidCategoryIds.length > 0) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "One or more selected restaurant types do not exist.",
        invalidRestaurantTypeIds: invalidCategoryIds,
      });
    }

    /* Duplicate email */
    const [emailRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email],
    );

    const emailExists = emailRows.length > 0;

    /* Duplicate phone */
    const [phoneRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE phone = ?
        LIMIT 1
      `,
      [phone],
    );

    const phoneExists = phoneRows.length > 0;

    if (emailExists && phoneExists) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(409).json({
        success: false,
        code: "EMAIL_PHONE_EXISTS",
        emailMessage: "This email address is already registered.",
        phoneMessage: "This phone number is already registered.",
      });
    }

    if (emailExists) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message: "This email address is already registered.",
      });
    }

    if (phoneExists) {
      await connection.rollback();

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(409).json({
        success: false,
        code: "PHONE_EXISTS",
        message: "This phone number is already registered.",
      });
    }

    const companyId = await generateCompanyId(connection);

    const softwareApiKey =
      await generateSoftwareApiKey(connection);

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await connection.execute(
      `
        INSERT INTO users (
          company_id,
          company_name,
          name,
          phone,
          email,
          role,
          designation,
          branchCount,
          branchCount_Remaining,
          password,
          software_api_key,
          restaurant_type,
          address,
          logo,
          expiry_date
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
        )
      `,
      [
        companyId,
        companyName,
        name,
        phone,
        email,
        3,
        designationId,
        finalBranchCount,
        finalBranchCount,
        hashedPassword,
        softwareApiKey,
        JSON.stringify(restaurantTypeIds),
        address,
        logoPath,
      ],
    );

    const newUserId = result.insertId;

    const defaultMenuIds = [6, 9, 10, 11, 12, 13, 14, 15];

    const menuValues = defaultMenuIds.map(() => "(?, ?)").join(", ");

    const menuParams = defaultMenuIds.flatMap((menuId) => [
      newUserId,
      menuId,
    ]);

    await connection.execute(
      `
        INSERT INTO user_user_menu (
          user_id,
          user_menu_id
        )
        VALUES ${menuValues}
      `,
      menuParams,
    );

    await connection.commit();

    const [expiryRows] = await connection.execute(
      `
        SELECT expiry_date
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [result.insertId],
    );

    const expiryDate = expiryRows[0]?.expiry_date || null;

    return res.status(201).json({
      success: true,
      message: "Company registered successfully.",

      data: {
        id: result.insertId,
        companyId,
        companyName,
        name,
        email,
        phone,
        role: 3,
        designation: designationId,
        branchCount: finalBranchCount,
        branchCount_Remaining: finalBranchCount,
        softwareApiKey,
        restaurantType: restaurantTypeIds,
        address,
        logo: logoPath,
        expiryDate,
      },
    });
  } catch (error) {
    console.error("Company registration error:", error);

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback failed:", rollbackError);
      }
    }

    if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (fileError) {
        console.error("Failed to delete uploaded logo:", fileError);
      }
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Company logo must be smaller than 50 KB.",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "A company with the same information already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Company registration failed.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/*
|--------------------------------------------------------------------------
| BRANCH REGISTRATION
|--------------------------------------------------------------------------
| POST /api/registration/branch
|--------------------------------------------------------------------------
*/
router.post("/branch", upload.single("logo"), async (req, res) => {
  let connection;

  try {
    const authCookie = req.cookies?.auth;

    if (!authCookie) {
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(401).json({
        success: false,
        message: "You must be logged in to register a branch.",
      });
    }

    let loggedInUser;

    try {
      loggedInUser = JSON.parse(authCookie);
    } catch (cookieError) {
      console.error("Failed to parse authentication cookie:", cookieError);

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(401).json({
        success: false,
        message: "Invalid authentication.",
      });
    }

    const createdBy = Number(loggedInUser.id);
    const companyId = Number(loggedInUser.company_id);
    const companyName = loggedInUser.company_name;

    if (!createdBy || !companyId || !companyName) {
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(401).json({
        success: false,
        message: "Your authentication information is incomplete.",
      });
    }

    const { branchName, email, phone, password, location } = req.body;

    if (!branchName || !email || !phone || !password || !location) {
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    const cleanBranchName = branchName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanLocation = location.trim();

    const emailAtIndex = cleanEmail.indexOf("@");

    const isValidEmail =
      emailAtIndex > 0 &&
      emailAtIndex < cleanEmail.length - 1 &&
      cleanEmail.includes(".", emailAtIndex + 1) &&
      !cleanEmail.includes(" ");

    if (!isValidEmail) {
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const phoneRegex = /^\d{11}$/;

    if (!phoneRegex.test(cleanPhone)) {
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Phone number must contain exactly 11 digits.",
      });
    }

    let logoPath = null;

    if (req.file) {
      logoPath = `/uploads/company/${req.file.filename}`;
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [companyRows] = await connection.execute(
      `
        SELECT
          branchCount,
          branchCount_Remaining
        FROM users
        WHERE company_id = ?
          AND role = 3
        LIMIT 1
        FOR UPDATE
      `,
      [companyId],
    );

    if (companyRows.length === 0) {
      await connection.rollback();

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
    }

    const branchCount = Number(companyRows[0].branchCount) || 0;
    const branchCountRemaining =
      Number(companyRows[0].branchCount_Remaining) || 0;

    if (branchCountRemaining <= 0) {
      await connection.rollback();

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(403).json({
        success: false,
        code: "NO_BRANCH_SLOT",
        message:
          "You have reached your maximum number of branches. No more branches can be created.",
        data: {
          branchCount,
          branchCount_Remaining: 0,
        },
      });
    }

    const [emailRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [cleanEmail],
    );

    const emailExists = emailRows.length > 0;

    const [phoneRows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE phone = ?
        LIMIT 1
      `,
      [cleanPhone],
    );

    const phoneExists = phoneRows.length > 0;

    if (emailExists && phoneExists) {
      await connection.rollback();

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(409).json({
        success: false,
        code: "EMAIL_PHONE_EXISTS",
        emailMessage: "This email address is already registered.",
        phoneMessage: "This phone number is already registered.",
      });
    }

    if (emailExists) {
      await connection.rollback();

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message: "This email address is already registered.",
      });
    }

    if (phoneExists) {
      await connection.rollback();

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error("Failed to delete uploaded logo:", fileError);
        }
      }

      return res.status(409).json({
        success: false,
        code: "PHONE_EXISTS",
        message: "This phone number is already registered.",
      });
    }

    const softwareApiKey =
      await generateSoftwareApiKey(connection);

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await connection.execute(
      `
        INSERT INTO users (
          company_id,
          company_name,
          phone,
          email,
          role,
          branchCount,
          password,
          software_api_key,
          restaurant_type,
          address,
          logo,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        companyId,
        cleanBranchName,
        cleanPhone,
        cleanEmail,
        4,
        null,
        hashedPassword,
        softwareApiKey,
        null,
        cleanLocation,
        logoPath,
        createdBy,
      ],
    );

    const newBranchCountRemaining = branchCountRemaining - 1;

    await connection.execute(
      `
        UPDATE users
        SET branchCount_Remaining = ?
        WHERE company_id = ?
          AND role = 3
      `,
      [newBranchCountRemaining, companyId],
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Branch registered successfully.",
      data: {
        id: result.insertId,
        companyId,
        companyName,
        branchName: cleanBranchName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 4,
        branchCount: null,
        branchCount_Remaining: newBranchCountRemaining,
        softwareApiKey,
        restaurantType: null,
        location: cleanLocation,
        logo: logoPath,
        createdBy,
      },
    });
  } catch (error) {
    console.error("Branch registration error:", error);

    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (fileError) {
        console.error("Failed to delete uploaded logo:", fileError);
      }
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Branch logo must be smaller than 50 KB.",
      });
    }

    if (
      error.message ===
      "Only JPG, PNG, WEBP and GIF images are allowed."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A branch with the same information already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Branch registration failed.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/*
|--------------------------------------------------------------------------
| GET RESTAURANT CATEGORIES
|--------------------------------------------------------------------------
*/
router.get("/restaurant-categories", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
          id,
          res_category
        FROM restaurant_category
        ORDER BY id ASC
      `,
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to fetch restaurant categories:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant categories.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET BRANCH COUNT INFORMATION
|--------------------------------------------------------------------------
| GET /api/registration/branch-count
|--------------------------------------------------------------------------
*/
router.get("/branch-count", async (req, res) => {
  let connection;

  try {
    const authCookie = req.cookies?.auth;

    if (!authCookie) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    let loggedInUser;

    try {
      loggedInUser = JSON.parse(authCookie);
    } catch (cookieError) {
      console.error("Failed to parse authentication cookie:", cookieError);

      return res.status(401).json({
        success: false,
        message: "Invalid authentication.",
      });
    }

    const companyId = Number(loggedInUser.company_id);

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Your authentication information is incomplete.",
      });
    }

    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `
        SELECT
          branchCount,
          branchCount_Remaining
        FROM users
        WHERE company_id = ?
          AND role = 3
        LIMIT 1
      `,
      [companyId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        branchCount: Number(rows[0].branchCount) || 0,
        branchCount_Remaining:
          Number(rows[0].branchCount_Remaining) || 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch branch count:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch branch count information.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;