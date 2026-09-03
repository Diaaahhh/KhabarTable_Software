import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  let connection;

  try {
    // =========================================================
    // GET LOGGED-IN USER FROM AUTH COOKIE
    // =========================================================

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
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication.",
      });
    }

    const userId = Number(loggedInUser.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user.",
      });
    }

    // =========================================================
    // DATABASE CONNECTION
    // =========================================================

    connection = await db.getConnection();

    // =========================================================
    // GET USER'S SIDEBAR MENUS
    // =========================================================

    const [rows] = await connection.execute(
      `
        SELECT
          um.id,
          um.parent_id,
          um.menu,
          um.icon,
          um.href
        FROM user_user_menu uum
        INNER JOIN user_menu um
          ON uum.user_menu_id = um.id
        WHERE uum.user_id = ?
        ORDER BY um.id ASC
      `,
      [userId]
    );

    // =========================================================
    // RETURN MENUS
    // =========================================================

    return res.status(200).json({
      success: true,
      menus: rows,
    });

  } catch (error) {
    console.error("Sidebar menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load sidebar menus.",
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;