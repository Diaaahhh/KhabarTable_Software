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

      /*
      |--------------------------------------------------------------------------
      | Validation
      |--------------------------------------------------------------------------
      */

      if (
        !companyName ||
  !name ||
  !email ||
  !phone ||
  !password ||
  !designation ||
  !address ||
  !restaurantType ||
  !branchCount
      ) {
        return res.status(400).json({
          success: false,
          message: "All required fields must be provided.",
        });
      }

      const finalBranchCount = Number(branchCount);

      if (
        !Number.isInteger(finalBranchCount) ||
        finalBranchCount < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Branch count must be a valid number.",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | Check Logo
      |--------------------------------------------------------------------------
      */

      let logoPath = null;

      if (req.file) {
        logoPath = `/uploads/company/${req.file.filename}`;
      }


      /*
      |--------------------------------------------------------------------------
      | Get Database Connection
      |--------------------------------------------------------------------------
      */

      connection = await db.getConnection();

      await connection.beginTransaction();


      /*
      |--------------------------------------------------------------------------
      | Check Duplicate Email
      |--------------------------------------------------------------------------
      */

      const [emailRows] = await connection.execute(
        `
          SELECT id
          FROM users
          WHERE email = ?
          LIMIT 1
        `,
        [email]
      );

      if (emailRows.length > 0) {
        await connection.rollback();

        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(409).json({
          success: false,
          message: "This email address is already registered.",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | Check Duplicate Phone
      |--------------------------------------------------------------------------
      */

      const [phoneRows] = await connection.execute(
        `
          SELECT id
          FROM users
          WHERE phone = ?
          LIMIT 1
        `,
        [phone]
      );

      if (phoneRows.length > 0) {
        await connection.rollback();

        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(409).json({
          success: false,
          message: "This phone number is already registered.",
        });
      }


      /*
      |--------------------------------------------------------------------------
      | Generate Company ID
      |--------------------------------------------------------------------------
      */

      const companyId = await generateCompanyId(
        connection
      );


      /*
      |--------------------------------------------------------------------------
      | Generate Software API Key
      |--------------------------------------------------------------------------
      */

      const softwareApiKey =
        await generateSoftwareApiKey(connection);


      /*
      |--------------------------------------------------------------------------
      | Hash Password
      |--------------------------------------------------------------------------
      */

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );


      /*
      |--------------------------------------------------------------------------
      | Insert Company
      |--------------------------------------------------------------------------
      |
      | role = 3
      |
      */

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
            logo
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          companyId,
          companyName,
          phone,
          email,
          3,
          finalBranchCount,
          hashedPassword,
          softwareApiKey,
          JSON.stringify(restaurantType),
          address,
          logoPath,
        ]
      );


      /*
      |--------------------------------------------------------------------------
      | Commit Transaction
      |--------------------------------------------------------------------------
      */

      await connection.commit();


      /*
      |--------------------------------------------------------------------------
      | Success Response
      |--------------------------------------------------------------------------
      */

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
          softwareApiKey,
          restaurantType,
          address,
          logo: logoPath,
        },
      });
    } catch (error) {
      console.error(
        "Company registration error:",
        error
      );

      if (connection) {
        await connection.rollback();
      }

      /*
      |--------------------------------------------------------------------------
      | Delete Uploaded Logo If Registration Failed
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | Multer File Size Error
      |--------------------------------------------------------------------------
      */

      if (
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Company logo must be smaller than 50 KB.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | MySQL Duplicate Entry
      |--------------------------------------------------------------------------
      */

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "A company with the same information already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Company registration failed.",
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


export default router;