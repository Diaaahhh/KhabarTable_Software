import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";

const router = express.Router();


// =========================================================
// LOGIN
// =========================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;


    // ---------------------------------------------------------
    // Validate input
    // ---------------------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }


    // ---------------------------------------------------------
    // Find user by email
    // ---------------------------------------------------------

    const [users] = await db.query(
      `
        SELECT
          id,
          company_id,
          company_name,
          phone,
          email,
          role,
          branchCount,
          password,
          software_api_key,
          restaurant_type,
          expiry_date,
          created_by
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email.trim()]
    );


    // ---------------------------------------------------------
    // User does not exist
    // ---------------------------------------------------------

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "No such user found.",
      });
    }


    const user = users[0];


    // ---------------------------------------------------------
    // Compare password
    // ---------------------------------------------------------

    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );


    // ---------------------------------------------------------
    // Wrong password
    // ---------------------------------------------------------

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        code: "WRONG_PASSWORD",
        message: "Wrong password.",
      });
    }


    // ---------------------------------------------------------
    // Store login information in HTTP-only cookie
    // ---------------------------------------------------------

    res.cookie(
      "auth",
      JSON.stringify({
        id: user.id,
        company_id: user.company_id,
        company_name: user.company_name,
        email: user.email,
        role: user.role,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }
    );


    // ---------------------------------------------------------
    // Successful login
    // ---------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful.",

      user: {
        id: user.id,
        company_id: user.company_id,
        company_name: user.company_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        branchCount: user.branchCount,
        software_api_key: user.software_api_key,
        restaurant_type: user.restaurant_type,
        expiry_date: user.expiry_date,
        created_by: user.created_by,
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});


export default router;