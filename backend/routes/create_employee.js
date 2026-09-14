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

const uploadDirectory = path.join(
  __dirname,
  "../uploads/employees"
);

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);

    const uniqueName =
      `employee_${Date.now()}_${Math.round(Math.random() * 1e9)}${extension}`;

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
        new Error("Only JPG, JPEG, PNG and WEBP images are allowed.")
      );
    }

    cb(null, true);
  },
});


// ======================================================
// Get User Information From Cookie
// ======================================================

function getUserFromCookie(req) {
  if (!req.cookies) {
    return null;
  }

  /*
    Find the cookie containing the logged-in user's JSON data.
  */

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
    } catch (error) {
      // Ignore cookies that are not JSON user data.
    }
  }

  return null;
}


// ======================================================
// CREATE EMPLOYEE
// ======================================================

router.post(
  "/create-employee",
  upload.single("photo"),

  async (req, res) => {
    try {
      // --------------------------------------------------
      // Get logged-in user from cookie
      // --------------------------------------------------

      const user = getUserFromCookie(req);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User authentication cookie not found.",
        });
      }

      const company_id = user.company_id;
      const created_by_id = user.id;


      // --------------------------------------------------
      // Get form values
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

      if (!employee_id?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee ID is required.",
        });
      }

      if (!first_name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name is required.",
        });
      }

      if (!employee_email?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee email is required.",
        });
      }

      if (!personal_email?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Personal email is required.",
        });
      }

      if (!phone?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone is required.",
        });
      }

      if (!gender) {
        return res.status(400).json({
          success: false,
          message: "Gender is required.",
        });
      }

      if (!blood_group) {
        return res.status(400).json({
          success: false,
          message: "Blood group is required.",
        });
      }

      if (!marital_status) {
        return res.status(400).json({
          success: false,
          message: "Marital status is required.",
        });
      }

      if (!national_id?.trim()) {
        return res.status(400).json({
          success: false,
          message: "National ID is required.",
        });
      }

      if (!address?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Address is required.",
        });
      }

      if (!joining_date) {
        return res.status(400).json({
          success: false,
          message: "Joining date is required.",
        });
      }


      // --------------------------------------------------
      // Employee Photo
      // --------------------------------------------------

      let photo = "";

      if (req.file) {
        photo = req.file.filename;
      }


      // --------------------------------------------------
      // Check Duplicate Employee ID
      // --------------------------------------------------

      const [existingEmployee] = await db.query(
        `
        SELECT id
        FROM employees_employee
        WHERE company_id = ?
          AND public_id = ?
        LIMIT 1
        `,
        [
          company_id,
          employee_id,
        ]
      );

      if (existingEmployee.length > 0) {

        // Delete uploaded image
        if (req.file) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (deleteError) {
            console.error(
              "Could not delete duplicate employee image:",
              deleteError
            );
          }
        }

        return res.status(409).json({
          success: false,
          message: "Employee ID already exists.",
        });
      }


      // --------------------------------------------------
      // Insert Employee
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


      const values = [
        // Cookie values
        company_id,
        created_by_id,

        // public_id = employee_id
        employee_id,

        // Names
        first_name,
        middle_name || "",
        last_name || "",
        preferred_name || "",

        // Contact
        employee_email,
        personal_email,
        phone,

        // Personal information
        date_of_birth || null,
        gender,
        blood_group,
        marital_status,

        national_id,
        passport_number || "",
        address,

        // Emergency contact
        emergency_contact_name || "",
        emergency_contact_phone || "",
        emergency_contact_relation || "",

        // Employment dates
        joining_date || null,
        confirmation_date || null,
        leaving_date || null,

        // Status
        employment_status || "active",

        // Photo
        photo,

        // Metadata
        JSON.stringify({}),
      ];


      const [result] = await db.query(
        sql,
        values
      );


      // --------------------------------------------------
      // Success
      // --------------------------------------------------

      return res.status(201).json({
        success: true,
        message: "Employee created successfully.",

        employee: {
          id: result.insertId,
          employee_id: employee_id,
          public_id: employee_id,
          company_id: company_id,
          created_by_id: created_by_id,
          photo: photo,
        },
      });

    } catch (error) {

      console.error(
        "Create employee error:",
        error
      );

      // Remove uploaded image if database insertion fails
      if (req.file) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (deleteError) {
          console.error(
            "Could not delete uploaded image:",
            deleteError
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: "Server error while creating employee.",
        error: error.message,
      });
    }
  }
);


// ======================================================
// EXPORT ROUTER
// ======================================================

export default router;