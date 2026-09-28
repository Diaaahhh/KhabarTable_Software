import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";

const router = express.Router();

// ======================================================
// ES MODULE __dirname
// ======================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// Upload Configuration
// ======================================================

const uploadDirectory = path.join(__dirname, "../uploads/employees");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `employee_${Date.now()}_${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 50 * 1024,
  },

  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
    }

    cb(null, true);
  },
});

// ======================================================
// Helpers
// ======================================================

function getUserFromCookie(req) {
  if (!req.cookies) return null;

  for (const cookieValue of Object.values(req.cookies)) {
    try {
      const decodedValue = decodeURIComponent(cookieValue);
      const parsedValue = JSON.parse(decodedValue);

      if (
        parsedValue &&
        parsedValue.id !== undefined &&
        parsedValue.company_id !== undefined
      ) {
        return parsedValue;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Safely delete an uploaded file.
 */
function safeDeleteFile(file) {
  if (!file) return;

  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (error) {
    console.error("Could not delete file:", error);
  }
}

/**
 * Convert an empty string, undefined or null into a real NULL for MySQL.
 */
function toNullableString(value) {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Convert an empty string, undefined or null into a real NULL.
 * Any non-empty value is returned as-is (so MySQL can cast it).
 */
function toNullableDate(value) {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
}

// ======================================================
// CHECK DUPLICATE EMPLOYEE ID (public_id)
// ======================================================
// POST /api/employees/check-employee-id
// Body: { employee_id: string, exclude_id?: number }
// ======================================================

router.post("/check-employee-id", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const company_id = user.company_id;

    const { employee_id, exclude_id } = req.body;

    const cleanEmployeeId = toNullableString(employee_id);

    if (!cleanEmployeeId) {
      return res.status(200).json({
        success: true,
        exists: false,
      });
    }

    let sql = `
      SELECT id
      FROM employees_employee
      WHERE company_id = ?
        AND public_id = ?
    `;

    const params = [company_id, cleanEmployeeId];

    if (exclude_id) {
      sql += ` AND id != ?`;
      params.push(Number(exclude_id));
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      exists: rows.length > 0,
    });
  } catch (error) {
    console.error("Check duplicate employee id error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while checking duplicate.",
    });
  }
});

// ======================================================
// CREATE EMPLOYEE
// ======================================================

router.post("/create-employee", upload.single("photo"), async (req, res) => {
  try {
    // --------------------------------------------------
    // Logged-in user
    // --------------------------------------------------

    const user = getUserFromCookie(req);

    if (!user) {
      safeDeleteFile(req.file);

      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const company_id = user.company_id;
    const created_by_id = user.id;

    // --------------------------------------------------
    // Form values
    // --------------------------------------------------

    const {
      employee_id,
      first_name,
      middle_name,
      last_name,
      preferred_name,

      employee_email,
      personal_email,

      phone,

      date_of_birth,
      gender,
      blood_group,
      marital_status,

      national_id,
      passport_number,

      address,

      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,

      joining_date,
      confirmation_date,
      leaving_date,

      employment_status,
    } = req.body;

    // --------------------------------------------------
    // Required field validation
    // --------------------------------------------------

    const requiredFields = [
      [employee_id, "Employee ID is required."],
      [first_name, "First name is required."],
      [employee_email, "Employee email is required."],
      [personal_email, "Personal email is required."],
      [phone, "Phone is required."],
      [gender, "Gender is required."],
      [blood_group, "Blood group is required."],
      [marital_status, "Marital status is required."],
      [national_id, "National ID is required."],
      [address, "Address is required."],
      [joining_date, "Joining date is required."],
    ];

    for (const [value, message] of requiredFields) {
      if (value === undefined || value === null || String(value).trim() === "") {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message,
        });
      }
    }

    // --------------------------------------------------
    // Photo
    // --------------------------------------------------

    const photo = req.file ? req.file.filename : null;

    // --------------------------------------------------
    // Duplicate check
    // --------------------------------------------------

    const [existingEmployee] = await db.query(
      `
        SELECT id
        FROM employees_employee
        WHERE company_id = ?
          AND public_id = ?
        LIMIT 1
      `,
      [company_id, String(employee_id).trim()],
    );

    if (existingEmployee.length > 0) {
      safeDeleteFile(req.file);

      return res.status(409).json({
        success: false,
        message: "Employee ID already exists.",
      });
    }

    // --------------------------------------------------
    // Normalize values to match the column count
    // --------------------------------------------------
    //
    // Columns (in order):
    //   1  company_id                     (int, not null)
    //   2  created_by_id                  (int, not null)
    //   3  updated_by_id                  (int, null)       -> NULL
    //   4  public_id                      (char(32), not null)
    //   5  user_id                        (int, null)       -> NULL
    //   6  first_name                     (varchar, not null)
    //   7  middle_name                    (varchar, not null)
    //   8  last_name                      (varchar, not null)
    //   9  preferred_name                 (varchar, not null)
    //   10 work_email                     (varchar, not null)
    //   11 personal_email                 (varchar, not null)
    //   12 phone                          (varchar, not null)
    //   13 date_of_birth                  (date, null)
    //   14 gender                         (varchar, not null)
    //   15 blood_group                    (varchar, not null)
    //   16 marital_status                 (varchar, not null)
    //   17 national_id                    (varchar, not null)
    //   18 passport_number                (varchar, not null)
    //   19 address                        (text, not null)
    //   20 emergency_contact_name         (varchar, not null)
    //   21 emergency_contact_phone        (varchar, not null)
    //   22 emergency_contact_relation     (varchar, not null)
    //   23 joining_date                   (date, null)
    //   24 confirmation_date              (date, null)
    //   25 leaving_date                   (date, null)
    //   26 employment_status              (varchar, not null, default 'active')
    //   27 photo                          (varchar(100), null)
    //   28 metadata                       (longtext, not null)
    //
    // NOTE: The `updated_by_id` and `user_id` columns are handled
    //       with literal NULLs in the SQL, so they are NOT in the
    //       values array.
    // --------------------------------------------------

    const values = [
      company_id,                                    // 1
      created_by_id,                                 // 2
      String(employee_id).trim(),                    // 4  public_id
      String(first_name).trim(),                     // 6
      String(middle_name ?? "").trim(),              // 7
      String(last_name ?? "").trim(),                // 8
      String(preferred_name ?? "").trim(),           // 9
      String(employee_email).trim(),                 // 10 work_email
      String(personal_email).trim(),                 // 11
      String(phone).trim(),                          // 12
      toNullableDate(date_of_birth),                 // 13
      String(gender).trim(),                         // 14
      String(blood_group).trim(),                    // 15
      String(marital_status).trim(),                 // 16
      String(national_id).trim(),                    // 17
      String(passport_number ?? "").trim(),          // 18
      String(address).trim(),                        // 19
      String(emergency_contact_name ?? "").trim(),   // 20
      String(emergency_contact_phone ?? "").trim(),  // 21
      String(emergency_contact_relation ?? "").trim(), // 22
      toNullableDate(joining_date),                  // 23
      toNullableDate(confirmation_date),             // 24
      toNullableDate(leaving_date),                  // 25
      String(employment_status || "active").trim(),  // 26
      photo,                                         // 27
      JSON.stringify({}),                            // 28 metadata
    ];

    // --------------------------------------------------
    // Insert
    // --------------------------------------------------

    const sql = `
      INSERT INTO employees_employee (
        company_id,
        created_by_id,
        updated_by_id,
        public_id,
        user_id,

        first_name,
        middle_name,
        last_name,
        preferred_name,

        work_email,
        personal_email,
        phone,

        date_of_birth,
        gender,
        blood_group,
        marital_status,

        national_id,
        passport_number,
        address,

        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,

        joining_date,
        confirmation_date,
        leaving_date,

        employment_status,
        photo,
        metadata
      )
      VALUES (
        ?,
        ?,
        NULL,
        ?,
        NULL,

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

        ?,
        ?,
        ?,

        ?,
        ?,
        ?,

        ?,
        ?,
        ?
      )
    `;

    const [result] = await db.query(sql, values);

    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",

      employee: {
        id: result.insertId,
        employee_id: String(employee_id).trim(),
        public_id: String(employee_id).trim(),
        company_id,
        created_by_id,
        photo,
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);

    // Delete uploaded photo if insertion failed
    safeDeleteFile(req.file);

    // --------------------------------------------------
    // Multer file size error
    // --------------------------------------------------

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Employee photo must be smaller than 50 KB.",
      });
    }

    // --------------------------------------------------
    // Multer file type error
    // --------------------------------------------------

    if (
      error.message ===
      "Only JPG, JPEG, PNG and WEBP images are allowed."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------
    // MySQL duplicate entry
    // --------------------------------------------------

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists.",
      });
    }

    // --------------------------------------------------
    // MySQL data too long
    // --------------------------------------------------

    if (error.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({
        success: false,
        message: `One of the fields is too long: ${error.sqlMessage}`,
      });
    }

    // --------------------------------------------------
    // MySQL missing NOT NULL field
    // --------------------------------------------------

    if (error.code === "ER_BAD_NULL_ERROR") {
      return res.status(400).json({
        success: false,
        message: `A required field is missing: ${error.sqlMessage}`,
      });
    }

    // --------------------------------------------------
    // MySQL incorrect date value
    // --------------------------------------------------

    if (error.code === "ER_TRUNCATED_WRONG_VALUE") {
      return res.status(400).json({
        success: false,
        message: `Invalid date or value supplied: ${error.sqlMessage}`,
      });
    }

    // --------------------------------------------------
    // Generic
    // --------------------------------------------------

    return res.status(500).json({
      success: false,
      message: "Server error while creating employee.",
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

export default router;