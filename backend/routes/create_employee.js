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

/* ======================================================
   MULTER STORAGE
   ====================================================== */

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
      return cb(
        new Error("Only JPG, JPEG, PNG and WEBP images are allowed."),
      );
    }

    cb(null, true);
  },
});

/* ======================================================
   GET USER FROM COOKIE
   ====================================================== */

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
      // Ignore cookies that are not JSON user data.
    }
  }

  return null;
}

/* ======================================================
   SAFE DELETE UPLOADED FILE
   ====================================================== */

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

/* ======================================================
   STRING HELPERS
   ====================================================== */

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
}

function toNullableDate(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
}

/* ======================================================
   GET DESIGNATIONS
   Used by the Add Employee form dropdown
   ====================================================== */

router.get("/designations", async (req, res) => {
  try {
    const [rows] = await db.query(
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

/* ======================================================
   CHECK DUPLICATE EMPLOYEE ID
   Duplicate only when BOTH:
   company_id + public_id match
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

/* =========================================================
   CHECK DUPLICATE PERSONAL EMAIL
   ========================================================= */

router.post("/check-email", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie is missing.",
      });
    }

    const company_id = Number(user.company_id);

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID is missing.",
      });
    }

    const personal_email = String(
      req.body?.personal_email ?? "",
    )
      .trim()
      .toLowerCase();

    if (!personal_email) {
      return res.status(400).json({
        success: false,
        message: "Personal email is required.",
      });
    }

    const [rows] = await db.query(
      `
        SELECT id
        FROM employees_employee
        WHERE company_id = ?
          AND LOWER(personal_email) = ?
        LIMIT 1
      `,
      [company_id, personal_email],
    );

    return res.json({
      success: true,
      exists: rows.length > 0,
    });
  } catch (error) {
    console.error("Check employee email error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check Personal Email.",
    });
  }
});

/* ======================================================
   CREATE EMPLOYEE
   ====================================================== */

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
        driving_lecense,
        passport_number,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
        joining_date,
        confirmation_date,
        employment_status,
        designation_id,
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
        [designation_id, "Designation is required."],
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

      const cleanEmployeeId = toNullableString(employee_id);

      if (!cleanEmployeeId) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Employee ID is required.",
        });
      }

      /* Designation validation */

      const cleanDesignationId = Number(designation_id);

      if (
        !Number.isInteger(cleanDesignationId) ||
        cleanDesignationId < 1
      ) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Designation is required.",
        });
      }

      const [designationRows] = await db.query(
        `
          SELECT id
          FROM organization_designation
          WHERE id = ?
            AND status = 'active'
          LIMIT 1
        `,
        [cleanDesignationId],
      );

      if (designationRows.length === 0) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Selected designation does not exist.",
        });
      }

      /* National ID */

      const cleanNationalId = String(national_id).trim();

      if (!/^\d{10,17}$/.test(cleanNationalId)) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "National ID must contain only numbers and be 10 to 17 digits.",
        });
      }

      /* Driving License */

      const cleanDrivingLicense = toNullableString(driving_lecense);

      if (
        cleanDrivingLicense &&
        !/^\d{10,17}$/.test(cleanDrivingLicense)
      ) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Driving License must contain only numbers and be 10 to 17 digits.",
        });
      }

      /* Phone */

      const cleanPhone = String(phone).trim();

      if (!/^\d{1,11}$/.test(cleanPhone)) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Phone number must contain only numbers and maximum 11 digits.",
        });
      }

      /* Emergency Phone */

      const cleanEmergencyPhone = toNullableString(
        emergency_contact_phone,
      );

      if (
        cleanEmergencyPhone &&
        !/^\d{1,11}$/.test(cleanEmergencyPhone)
      ) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Emergency contact phone must contain only numbers and maximum 11 digits.",
        });
      }

      /* Duplicate employee ID */

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

      const photo = req.file ? req.file.filename : null;

      const values = [
        company_id,
        created_by_id,
        cleanEmployeeId,
        String(first_name).trim(),
        String(personal_email).trim(),
        cleanPhone,
        toNullableDate(date_of_birth),
        String(gender).trim(),
        String(blood_group).trim(),
        String(marital_status).trim(),
        cleanNationalId,
        toNullableString(passport_number),
        String(address).trim(),
        toNullableString(emergency_contact_name),
        cleanEmergencyPhone,
        toNullableString(emergency_contact_relation),
        toNullableDate(joining_date),
        toNullableDate(confirmation_date),
        String(employment_status || "active").trim(),
        photo,
        JSON.stringify({}),
        cleanDrivingLicense,
        cleanDesignationId,
      ];

      const sql = `
        INSERT INTO employees_employee (
          company_id,
          created_by_id,
          public_id,
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
          photo,
          metadata,
          driving_lecense,
          designation_id
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
          driving_lecense: cleanDrivingLicense,
          designation_id: cleanDesignationId,
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

/* ======================================================
   GET EMPLOYEE LIST
   ====================================================== */

router.get("/list-employees", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const company_id = Number(user.company_id);

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID is missing.",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const [[countResult]] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM employees_employee
        WHERE company_id = ?
      `,
      [company_id],
    );

    const total = Number(countResult.total);

    const [rows] = await db.query(
      `
        SELECT
          e.id,
          e.company_id,
          e.package_id,
          e.created_by_id,
          e.updated_by_id,
          e.public_id,
          e.user_id,
          e.first_name,
          e.personal_email,
          e.phone,
          e.date_of_birth,
          e.gender,
          e.blood_group,
          e.marital_status,
          e.national_id,
          e.passport_number,
          e.address,
          e.emergency_contact_name,
          e.emergency_contact_phone,
          e.emergency_contact_relation,
          e.joining_date,
          e.confirmation_date,
          e.employment_status,
          e.photo,
          e.driving_lecense,
          e.designation_id,
          d.name AS designation_name
        FROM employees_employee e
        LEFT JOIN organization_designation d
          ON d.id = e.designation_id
        WHERE e.company_id = ?
        ORDER BY e.id DESC
        LIMIT ? OFFSET ?
      `,
      [company_id, limit, offset],
    );

    return res.status(200).json({
      success: true,
      employees: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get employee list error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching employees.",
    });
  }
});

/* ======================================================
   GET SINGLE EMPLOYEE
   ====================================================== */

router.get("/employee/:id", async (req, res) => {
  try {
    const user = getUserFromCookie(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User authentication cookie not found.",
      });
    }

    const company_id = Number(user.company_id);
    const employeeId = Number(req.params.id);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          id,
          company_id,
          package_id,
          created_by_id,
          updated_by_id,
          public_id,
          user_id,
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
          photo,
          driving_lecense,
          designation_id
        FROM employees_employee
        WHERE id = ?
          AND company_id = ?
        LIMIT 1
      `,
      [employeeId, company_id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      employee: rows[0],
    });
  } catch (error) {
    console.error("Get single employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching employee.",
    });
  }
});

/* ======================================================
   UPDATE EMPLOYEE
   ====================================================== */

router.put(
  "/update-employee/:id",
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

      const company_id = Number(user.company_id);
      const updated_by_id = Number(user.id);
      const employeeId = Number(req.params.id);

      if (!employeeId) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Invalid employee ID.",
        });
      }

      const [existingRows] = await db.query(
        `
          SELECT *
          FROM employees_employee
          WHERE id = ?
            AND company_id = ?
          LIMIT 1
        `,
        [employeeId, company_id],
      );

      if (existingRows.length === 0) {
        safeDeleteFile(req.file);

        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      const existingEmployee = existingRows[0];

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
        driving_lecense,
        passport_number,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relation,
        joining_date,
        confirmation_date,
        employment_status,
        package_id,
        designation_id,
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
        [designation_id, "Designation is required."],
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

      const cleanEmployeeId = String(employee_id).trim();

      /* Designation */

      const cleanDesignationId = Number(designation_id);

      if (
        !Number.isInteger(cleanDesignationId) ||
        cleanDesignationId < 1
      ) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Designation is required.",
        });
      }

      const [designationRows] = await db.query(
        `
          SELECT id
          FROM organization_designation
          WHERE id = ?
            AND status = 'active'
          LIMIT 1
        `,
        [cleanDesignationId],
      );

      if (designationRows.length === 0) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message: "Selected designation does not exist.",
        });
      }

      const cleanNationalId = String(national_id).trim();

      if (!/^\d{10,17}$/.test(cleanNationalId)) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "National ID must contain only numbers and be 10 to 17 digits.",
        });
      }

      const cleanDrivingLicense = toNullableString(driving_lecense);

      if (
        cleanDrivingLicense &&
        !/^\d{10,17}$/.test(cleanDrivingLicense)
      ) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Driving License must contain only numbers and be 10 to 17 digits.",
        });
      }

      const cleanPhone = String(phone).trim();

      if (!/^\d{1,11}$/.test(cleanPhone)) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Phone number must contain only numbers and maximum 11 digits.",
        });
      }

      const cleanEmergencyPhone = toNullableString(
        emergency_contact_phone,
      );

      if (
        cleanEmergencyPhone &&
        !/^\d{1,11}$/.test(cleanEmergencyPhone)
      ) {
        safeDeleteFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Emergency contact phone must contain only numbers and maximum 11 digits.",
        });
      }

      const [duplicateEmployee] = await db.query(
        `
          SELECT id
          FROM employees_employee
          WHERE company_id = ?
            AND public_id = ?
            AND id != ?
          LIMIT 1
        `,
        [company_id, cleanEmployeeId, employeeId],
      );

      if (duplicateEmployee.length > 0) {
        safeDeleteFile(req.file);

        return res.status(409).json({
          success: false,
          message: "Employee ID already exists.",
        });
      }

      const cleanEmail = String(personal_email).trim().toLowerCase();

      const [duplicateEmail] = await db.query(
        `
          SELECT id
          FROM employees_employee
          WHERE company_id = ?
            AND LOWER(personal_email) = ?
            AND id != ?
          LIMIT 1
        `,
        [company_id, cleanEmail, employeeId],
      );

      if (duplicateEmail.length > 0) {
        safeDeleteFile(req.file);

        return res.status(409).json({
          success: false,
          message: "Personal email already exists.",
        });
      }

      let photo = existingEmployee.photo;

      if (req.file) {
        photo = req.file.filename;
      }

      await db.query(
        `
          UPDATE employees_employee
          SET
            package_id = ?,
            updated_by_id = ?,
            public_id = ?,
            first_name = ?,
            personal_email = ?,
            phone = ?,
            date_of_birth = ?,
            gender = ?,
            blood_group = ?,
            marital_status = ?,
            national_id = ?,
            passport_number = ?,
            address = ?,
            emergency_contact_name = ?,
            emergency_contact_phone = ?,
            emergency_contact_relation = ?,
            joining_date = ?,
            confirmation_date = ?,
            employment_status = ?,
            photo = ?,
            driving_lecense = ?,
            designation_id = ?
          WHERE id = ?
            AND company_id = ?
        `,
        [
          toNullableString(package_id),
          updated_by_id,
          cleanEmployeeId,
          String(first_name).trim(),
          cleanEmail,
          cleanPhone,
          toNullableDate(date_of_birth),
          String(gender).trim(),
          String(blood_group).trim(),
          String(marital_status).trim(),
          cleanNationalId,
          toNullableString(passport_number),
          String(address).trim(),
          toNullableString(emergency_contact_name),
          cleanEmergencyPhone,
          toNullableString(emergency_contact_relation),
          toNullableDate(joining_date),
          toNullableDate(confirmation_date),
          String(employment_status || "active").trim(),
          photo,
          cleanDrivingLicense,
          cleanDesignationId,
          employeeId,
          company_id,
        ],
      );

      if (
        req.file &&
        existingEmployee.photo &&
        existingEmployee.photo !== req.file.filename
      ) {
        const oldPhotoPath = path.join(
          uploadDirectory,
          existingEmployee.photo,
        );

        try {
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        } catch (error) {
          console.error(
            "Could not delete old employee photo:",
            error,
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: "Employee updated successfully.",
      });
    } catch (error) {
      console.error("Update employee error:", error);

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
          message: "Employee ID or Personal Email already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Server error while updating employee.",
        error: error.message,
      });
    }
  },
);

export default router;