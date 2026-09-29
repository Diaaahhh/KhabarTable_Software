import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function toNullableString(value) {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
}

function toNullableDate(value) {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
}

/* ======================================================
   CHECK DUPLICATE EMPLOYEE ID (public_id)
   ====================================================== */

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

router.post(
  "/create-employee",
  upload.single("photo"),
  async (req, res) => {
    try {
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

      const {
        employee_id,
        first_name,
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
        employment_status,
      } = req.body;

      const requiredFields = [
        [employee_id, "Employee ID is required."],
        [first_name, "First name is required."],
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
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          safeDeleteFile(req.file);

          return res.status(400).json({
            success: false,
            message,
          });
        }
      }

      const photo = req.file ? req.file.filename : null;

      // ======================================================
      // CHECK DUPLICATE EMPLOYEE ID
      // Same logic as /check-employee-id:
      // duplicate only when BOTH company_id and public_id match
      // ======================================================

      const cleanEmployeeId = toNullableString(employee_id);

      if (!cleanEmployeeId) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Employee ID is required.",
        });
      }

      const [existingEmployee] = await db.query(
        `
          SELECT id
          FROM employees_employee
          WHERE company_id = ?
            AND public_id = ?
          LIMIT 1
        `,
        [company_id, cleanEmployeeId],
      );

      if (existingEmployee.length > 0) {
        safeDeleteFile(req.file);

        return res.status(409).json({
          success: false,
          message: "Employee ID already exists.",
        });
      }

      // ======================================================
      // EMPLOYEE INSERT VALUES
      // ======================================================

      const values = [
        company_id,
        created_by_id,
        cleanEmployeeId,
        String(first_name).trim(),
        String(personal_email).trim(),
        String(phone).trim(),
        toNullableDate(date_of_birth),
        String(gender).trim(),
        String(blood_group).trim(),
        String(marital_status).trim(),
        String(national_id).trim(),
        String(passport_number ?? "").trim(),
        String(address).trim(),
        String(emergency_contact_name ?? "").trim(),
        String(emergency_contact_phone ?? "").trim(),
        String(emergency_contact_relation ?? "").trim(),
        toNullableDate(joining_date),
        toNullableDate(confirmation_date),
        String(employment_status || "active").trim(),
        photo,
        JSON.stringify({}),
      ];

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
          '',
          '',
          '',
          '',
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
          NULL,
          ?,
          ?,
          ?
        )
      `;

      const [result] = await db.query(sql, values);

      return res.status(201).json({
        success: true,
        message: "Employee created successfully.",
        employee: {
          id: result.insertId,
          employee_id: cleanEmployeeId,
          public_id: cleanEmployeeId,
          company_id,
          created_by_id,
          photo,
        },
      });
    } catch (error) {
      console.error("Create employee error:", error);

      safeDeleteFile(req.file);

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Employee photo must be smaller than 50 KB.",
        });
      }

      if (
        error.message ===
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "Employee ID already exists.",
        });
      }

      if (error.code === "ER_DATA_TOO_LONG") {
        return res.status(400).json({
          success: false,
          message: `One of the fields is too long: ${error.sqlMessage}`,
        });
      }

      if (error.code === "ER_BAD_NULL_ERROR") {
        return res.status(400).json({
          success: false,
          message: `A required field is missing: ${error.sqlMessage}`,
        });
      }

      if (error.code === "ER_TRUNCATED_WRONG_VALUE") {
        return res.status(400).json({
          success: false,
          message: `Invalid date or value supplied: ${error.sqlMessage}`,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Server error while creating employee.",
        error: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
      });
    }
  },
);

export default router;