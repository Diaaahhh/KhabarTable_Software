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

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "company"
);

// Create directory if it does not exist
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

    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      extension;

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
        new Error(
          "Only JPG, PNG, WEBP and GIF images are allowed."
        )
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
    [445000, 445999]
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
|
| c000000000000001
| c000000000000002
| c000000000000003
| ...
|
*/

async function generateSoftwareApiKey(connection) {
  let apiKey;
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(
      1000000 + Math.random() * 9000000
    );

    apiKey = `445${randomNumber}`;

    const [rows] = await connection.execute(
      `
        SELECT id
        FROM users
        WHERE software_api_key = ?
        LIMIT 1
      `,
      [apiKey]
    );

    exists = rows.length > 0;
  }

  return apiKey;
}

/*
|--------------------------------------------------------------------------
| CHECK DUPLICATE EMAIL OR PHONE IN REALTIME
|--------------------------------------------------------------------------
|
| POST /api/registration/check-duplicate
| Body: { field: "email" | "phone", value: string, companyId?: number }
|
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

    // Exclude current company ID if in Edit Mode
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
| COMPANY REGISTRATION
|--------------------------------------------------------------------------
|
| POST /api/registration/company
|
*/
router.post(
  "/company",
  upload.single("logo"),
  async (req, res) => {
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

      // =========================================================
      // Validation
      // =========================================================

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

      // =========================================================
      // Check Logo
      // =========================================================

      let logoPath = null;

      if (req.file) {
        logoPath = `/uploads/company/${req.file.filename}`;
      }

      // =========================================================
      // Get Database Connection
      // =========================================================

      connection = await db.getConnection();
      await connection.beginTransaction();

      // =========================================================
      // Validate Restaurant Types
      // =========================================================

      let restaurantTypeIds;

      try {
        restaurantTypeIds = JSON.parse(restaurantType);
      } catch (error) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message: "Invalid restaurant type selection.",
        });
      }

      // Must be an array
      if (
        !Array.isArray(restaurantTypeIds) ||
        restaurantTypeIds.length === 0
      ) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message: "Please select at least one restaurant type.",
        });
      }

      // Convert IDs to numbers
      restaurantTypeIds = restaurantTypeIds.map((id) => Number(id));

      // Validate every ID
      const hasInvalidRestaurantType =
        restaurantTypeIds.some(
          (id) => !Number.isInteger(id) || id < 1
        );

      if (hasInvalidRestaurantType) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message: "One or more restaurant types are invalid.",
        });
      }

      // Remove duplicate IDs
      restaurantTypeIds = [...new Set(restaurantTypeIds)];

      // =========================================================
      // Check All Restaurant Categories Exist
      // =========================================================

      const placeholders = restaurantTypeIds
        .map(() => "?")
        .join(", ");

      const [restaurantCategoryRows] =
        await connection.execute(
          `
            SELECT id
            FROM restaurant_category
            WHERE id IN (${placeholders})
          `,
          restaurantTypeIds
        );

      const existingCategoryIds =
        restaurantCategoryRows.map((row) => Number(row.id));

      const invalidCategoryIds =
        restaurantTypeIds.filter(
          (id) => !existingCategoryIds.includes(id)
        );

      if (invalidCategoryIds.length > 0) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message:
            "One or more selected restaurant types do not exist.",
          invalidRestaurantTypeIds: invalidCategoryIds,
        });
      }

      // =========================================================
      // Check Duplicate Email
      // =========================================================

      const [emailRows] = await connection.execute(
        `
          SELECT id
          FROM users
          WHERE email = ?
          LIMIT 1
        `,
        [email]
      );

      const emailExists = emailRows.length > 0;

      // =========================================================
      // Check Duplicate Phone
      // =========================================================

      const [phoneRows] = await connection.execute(
        `
          SELECT id
          FROM users
          WHERE phone = ?
          LIMIT 1
        `,
        [phone]
      );

      const phoneExists = phoneRows.length > 0;

      // =========================================================
      // Handle Duplicate Email + Phone
      // =========================================================

      if (emailExists && phoneExists) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(409).json({
          success: false,
          code: "EMAIL_PHONE_EXISTS",
          emailMessage:
            "This email address is already registered.",
          phoneMessage:
            "This phone number is already registered.",
        });
      }

      // =========================================================
      // Handle Duplicate Email
      // =========================================================

      if (emailExists) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(409).json({
          success: false,
          code: "EMAIL_EXISTS",
          message: "This email address is already registered.",
        });
      }

      // =========================================================
      // Handle Duplicate Phone
      // =========================================================

      if (phoneExists) {
        await connection.rollback();

        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(409).json({
          success: false,
          code: "PHONE_EXISTS",
          message: "This phone number is already registered.",
        });
      }

      // =========================================================
      // Generate Company ID
      // =========================================================

      const companyId = await generateCompanyId(connection);

      // =========================================================
      // Generate Software API Key
      // =========================================================

      const softwareApiKey =
        await generateSoftwareApiKey(connection);

      // =========================================================
      // Hash Password
      // =========================================================

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      // =========================================================
      // Insert Company
      //
      // role = 3
      // branchCount_Remaining = branchCount initially
      // =========================================================

      const [result] = await connection.execute(
  `
    INSERT INTO users (
      company_id,
      company_name,
      phone,
      email,
      role,
      branchCount,
      branchCount_Remaining,
      password,
      software_api_key,
      restaurant_type,
      address,
      logo,
      expiry_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
  `,
  [
    companyId,
    companyName,
    phone,
    email,
    3,
    finalBranchCount,
    finalBranchCount,
    hashedPassword,
    softwareApiKey,
    JSON.stringify(restaurantTypeIds),
    address,
    logoPath,
  ]
);

      // =========================================================
      // Assign Default Menus to New Company User
      // =========================================================

      const newUserId = result.insertId;

      const defaultMenuIds = [
        6,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
      ];

      const menuValues = defaultMenuIds
        .map(() => "(?, ?)")
        .join(", ");

      const menuParams = defaultMenuIds.flatMap(
        (menuId) => [
          newUserId,
          menuId,
        ]
      );

      await connection.execute(
        `
          INSERT INTO user_user_menu (
            user_id,
            user_menu_id
          )
          VALUES ${menuValues}
        `,
        menuParams
      );

      // =========================================================
      // Commit Transaction
      // =========================================================

      await connection.commit();

      const [expiryRows] = await connection.execute(
  `
    SELECT expiry_date
    FROM users
    WHERE id = ?
    LIMIT 1
  `,
  [result.insertId]
);

const expiryDate = expiryRows[0]?.expiry_date || null;
      // =========================================================
      // Success Response
      // =========================================================

      return res.status(201).json({
        success: true,
        message: "Company registered successfully.",
        
        data: {
  id: result.insertId,
  companyId,
  companyName,
  email,
  phone,
  role: 3,
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
      console.error(
        "Company registration error:",
        error
      );

      // =========================================================
      // Rollback Transaction
      // =========================================================

      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error(
            "Transaction rollback failed:",
            rollbackError
          );
        }
      }

      // =========================================================
      // Delete Uploaded Logo If Registration Failed
      // =========================================================

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error(
            "Failed to delete uploaded logo:",
            fileError
          );
        }
      }

      // =========================================================
      // Multer File Size Error
      // =========================================================

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message:
            "Company logo must be smaller than 50 KB.",
        });
      }

      // =========================================================
      // MySQL Duplicate Entry
      // =========================================================

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "A company with the same information already exists.",
        });
      }

      // =========================================================
      // General Error
      // =========================================================

      return res.status(500).json({
        success: false,
        message: "Company registration failed.",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);



/*
|--------------------------------------------------------------------------
| BRANCH REGISTRATION
|--------------------------------------------------------------------------
|
| This endpoint will be completed when the branch
| registration form is created.
|
| Company registration and branch registration
| will use this same registration.js file.
|
*/

/*
|--------------------------------------------------------------------------
| BRANCH REGISTRATION
|--------------------------------------------------------------------------
|
| POST /api/registration/branch
|
| Cookie:
|   auth.id           -> created_by
|   auth.company_id   -> company_id
|   auth.company_name -> company_name
|
| Database:
|   role              -> 4
|   branchCount       -> NULL
|   restaurant_type   -> NULL
|
|--------------------------------------------------------------------------
*/

router.post(
  "/branch",
  upload.single("logo"),
  async (req, res) => {
    let connection;

    try {
      // =========================================================
      // GET LOGGED-IN USER FROM COOKIE
      // =========================================================

      const authCookie = req.cookies?.auth;

      if (!authCookie) {
        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
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
        console.error(
          "Failed to parse authentication cookie:",
          cookieError
        );

        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(401).json({
          success: false,
          message: "Invalid authentication.",
        });
      }

      // =========================================================
      // GET COMPANY INFORMATION FROM COOKIE
      // =========================================================

      const createdBy = Number(loggedInUser.id);
      const companyId = Number(loggedInUser.company_id);
      const companyName = loggedInUser.company_name;

      if (
        !createdBy ||
        !companyId ||
        !companyName
      ) {
        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(401).json({
          success: false,
          message:
            "Your authentication information is incomplete.",
        });
      }

      // =========================================================
      // GET FORM DATA
      // =========================================================
      //
      // name and designation are intentionally received but
      // NOT stored in the users table.
      //
      // branchName -> company_name
      // location   -> address
      //
      // =========================================================

      const {
        branchName,
        email,
        phone,
        password,
        location,
      } = req.body;

      // =========================================================
      // REQUIRED FIELD VALIDATION
      // =========================================================

      if (
        !branchName ||
        !email ||
        !phone ||
        !password ||
        !location
      ) {
        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message: "All required fields must be provided.",
        });
      }

      // =========================================================
      // NORMALIZE DATA
      // =========================================================

      const cleanBranchName = branchName.trim();
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim();
      const cleanLocation = location.trim();

      // =========================================================
      // EMAIL VALIDATION
      // =========================================================

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
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      // =========================================================
      // PHONE VALIDATION
      // =========================================================

      const phoneRegex = /^\d{11}$/;

      if (!phoneRegex.test(cleanPhone)) {
        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(400).json({
          success: false,
          message:
            "Phone number must contain exactly 11 digits.",
        });
      }

      // =========================================================
      // CHECK LOGO
      // =========================================================

      let logoPath = null;

      if (req.file) {
        logoPath = `/uploads/company/${req.file.filename}`;
      }

      // =========================================================
      // GET DATABASE CONNECTION
      // =========================================================

      connection = await db.getConnection();

await connection.beginTransaction();

// =========================================================
// CHECK REMAINING BRANCH COUNT
// =========================================================

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
  [companyId]
);

if (companyRows.length === 0) {
  await connection.rollback();

  if (req.file) {
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (fileError) {
      console.error(
        "Failed to delete uploaded logo:",
        fileError
      );
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

// ---------------------------------------------------------
// NO BRANCH SLOT REMAINING
// ---------------------------------------------------------

if (branchCountRemaining <= 0) {
  await connection.rollback();

  if (req.file) {
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (fileError) {
      console.error(
        "Failed to delete uploaded logo:",
        fileError
      );
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

      // =========================================================
      // CHECK DUPLICATE EMAIL
      // =========================================================

      const [emailRows] = await connection.execute(
        `
          SELECT id
          FROM users
          WHERE email = ?
          LIMIT 1
        `,
        [cleanEmail]
      );

      const emailExists = emailRows.length > 0;

      // =========================================================
      // CHECK DUPLICATE PHONE
      // =========================================================

      const [phoneRows] = await connection.execute(
        `
          SELECT id
          FROM users
          WHERE phone = ?
          LIMIT 1
        `,
        [cleanPhone]
      );

      const phoneExists = phoneRows.length > 0;

      // =========================================================
      // BOTH EMAIL AND PHONE EXIST
      // =========================================================

      if (emailExists && phoneExists) {
        await connection.rollback();

        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(409).json({
          success: false,
          code: "EMAIL_PHONE_EXISTS",
          emailMessage:
            "This email address is already registered.",
          phoneMessage:
            "This phone number is already registered.",
        });
      }

      // =========================================================
      // EMAIL EXISTS
      // =========================================================

      if (emailExists) {
        await connection.rollback();

        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(409).json({
          success: false,
          code: "EMAIL_EXISTS",
          message:
            "This email address is already registered.",
        });
      }

      // =========================================================
      // PHONE EXISTS
      // =========================================================

      if (phoneExists) {
        await connection.rollback();

        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (fileError) {
            console.error(
              "Failed to delete uploaded logo:",
              fileError
            );
          }
        }

        return res.status(409).json({
          success: false,
          code: "PHONE_EXISTS",
          message:
            "This phone number is already registered.",
        });
      }

      // =========================================================
      // GENERATE UNIQUE SOFTWARE API KEY
      // =========================================================

      const softwareApiKey =
        await generateSoftwareApiKey(connection);

      // =========================================================
      // HASH PASSWORD
      // =========================================================

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      // =========================================================
      // INSERT BRANCH
      // =========================================================
      //
      // company_id       -> cookie
      // company_name     -> branch name
      // phone            -> form
      // email            -> form
      // role             -> 4
      // branchCount      -> NULL
      // password         -> hashed password
      // software_api_key -> generated
      // restaurant_type  -> NULL
      // address          -> location
      // logo             -> uploaded image
      // created_by       -> cookie id
      //
      // name             -> NOT STORED
      // designation      -> NOT STORED
      //
      // =========================================================

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
        ]
      );

      // =========================================================
// DECREASE REMAINING BRANCH COUNT
// =========================================================

const newBranchCountRemaining = branchCountRemaining - 1;

await connection.execute(
  `
    UPDATE users
    SET branchCount_Remaining = ?
    WHERE company_id = ?
      AND role = 3
  `,
  [
    newBranchCountRemaining,
    companyId,
  ]
);
      // =========================================================
      // COMMIT TRANSACTION
      // =========================================================

      await connection.commit();

      // =========================================================
      // SUCCESS RESPONSE
      // =========================================================

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
      console.error(
        "Branch registration error:",
        error
      );

      // =======================================================
      // ROLLBACK
      // =======================================================

      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error(
            "Rollback failed:",
            rollbackError
          );
        }
      }

      // =======================================================
      // DELETE UPLOADED LOGO IF REGISTRATION FAILED
      // =======================================================

      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (fileError) {
          console.error(
            "Failed to delete uploaded logo:",
            fileError
          );
        }
      }

      // =======================================================
      // MULTER FILE SIZE ERROR
      // =======================================================

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message:
            "Branch logo must be smaller than 50 KB.",
        });
      }

      // =======================================================
      // MULTER FILE TYPE ERROR
      // =======================================================

      if (
        error.message ===
        "Only JPG, PNG, WEBP and GIF images are allowed."
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // =======================================================
      // MYSQL DUPLICATE ENTRY
      // =======================================================

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "A branch with the same information already exists.",
        });
      }

      // =======================================================
      // GENERAL ERROR
      // =======================================================

      return res.status(500).json({
        success: false,
        message:
          "Branch registration failed.",
      });

    } finally {
      // =======================================================
      // RELEASE CONNECTION
      // =======================================================

      if (connection) {
        connection.release();
      }
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET RESTAURANT CATEGORIES
|--------------------------------------------------------------------------
|
| GET /api/registration/restaurant-categories
|
| Fetches restaurant types from:
| restaurant_category
|
|--------------------------------------------------------------------------
*/

router.get(
  "/restaurant-categories",
  async (req, res) => {
    try {
      const [rows] = await db.execute(
        `
          SELECT
            id,
            res_category
          FROM restaurant_category
          ORDER BY id ASC
        `
      );

      return res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error(
        "Failed to fetch restaurant categories:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch restaurant categories.",
      });
    }
  }
);

// =========================================================
// GET BRANCH COUNT INFORMATION
// =========================================================
// GET /api/registration/branch-count
//
// Returns:
// branchCount           -> Total branches allowed
// branchCount_Remaining -> Remaining branches that can be created
// =========================================================

router.get(
  "/branch-count",
  async (req, res) => {
    let connection;

    try {
      // =======================================================
      // GET LOGGED-IN USER FROM COOKIE
      // =======================================================

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
        console.error(
          "Failed to parse authentication cookie:",
          cookieError
        );

        return res.status(401).json({
          success: false,
          message: "Invalid authentication.",
        });
      }

      // =======================================================
      // GET COMPANY ID
      // =======================================================

      const companyId = Number(loggedInUser.company_id);

      if (!companyId) {
        return res.status(401).json({
          success: false,
          message:
            "Your authentication information is incomplete.",
        });
      }

      // =======================================================
      // DATABASE CONNECTION
      // =======================================================

      connection = await db.getConnection();

      // =======================================================
      // GET BRANCH COUNT
      // =======================================================

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
        [companyId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Company information not found.",
        });
      }

      // =======================================================
      // RESPONSE
      // =======================================================

      return res.status(200).json({
        success: true,
        data: {
          branchCount: Number(rows[0].branchCount) || 0,
          branchCount_Remaining:
            Number(rows[0].branchCount_Remaining) || 0,
        },
      });

    } catch (error) {
      console.error(
        "Failed to fetch branch count:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch branch count information.",
      });

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

export default router;