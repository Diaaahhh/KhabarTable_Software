import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/check", async (req, res) => {
  try {
    console.log("=================================");
    console.log("BACKEND PERMISSION CHECK");

    // ---------------------------------------
    // Get auth cookie
    // ---------------------------------------
    const authCookie = req.cookies?.auth;
    const requestedPath = req.query.path;

    console.log("Received auth cookie:", authCookie);
    console.log("Requested path:", requestedPath);

    // ---------------------------------------
    // Check authentication
    // ---------------------------------------
    if (!authCookie) {
      console.log("NO AUTH COOKIE");

      return res.status(401).json({
        success: false,
        allowed: false,
        message: "Not authenticated",
      });
    }

    // ---------------------------------------
    // Parse auth cookie
    // ---------------------------------------
    let user;

    try {
      user = JSON.parse(decodeURIComponent(authCookie));
    } catch (error) {
      console.error("AUTH COOKIE PARSE ERROR:", error);

      return res.status(401).json({
        success: false,
        allowed: false,
        message: "Invalid authentication cookie",
      });
    }

    const userId = Number(user.id);

    console.log("Parsed user:", user);
    console.log("User ID:", userId);

    // ---------------------------------------
    // Validate user ID
    // ---------------------------------------
    if (!userId || Number.isNaN(userId)) {
      console.log("INVALID USER ID");

      return res.status(401).json({
        success: false,
        allowed: false,
        message: "Invalid user ID",
      });
    }

    // ---------------------------------------
    // Validate path
    // ---------------------------------------
    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: "Path is required",
      });
    }

    // ---------------------------------------
    // Check permission
    // ---------------------------------------
    const [rows] = await db.query(
      `
      SELECT
        um.id,
        um.menu,
        um.href
      FROM user_user_menu uum
      INNER JOIN user_menu um
        ON um.id = uum.user_menu_id
      WHERE uum.user_id = ?
        AND um.href = ?
      LIMIT 1
      `,
      [userId, requestedPath]
    );

    console.log("SQL user ID:", userId);
    console.log("SQL requested path:", requestedPath);
    console.log("SQL result:", rows);

    // ---------------------------------------
    // Permission denied
    // ---------------------------------------
    if (rows.length === 0) {
      console.log("PERMISSION DENIED");

      return res.status(403).json({
        success: false,
        allowed: false,
        message: "You do not have permission to access this page.",
      });
    }

    // ---------------------------------------
    // Permission granted
    // ---------------------------------------
    console.log("PERMISSION GRANTED");

    return res.status(200).json({
      success: true,
      allowed: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Permission check error:", error);

    return res.status(500).json({
      success: false,
      allowed: false,
      message: "Server error",
    });
  }
});

export default router;