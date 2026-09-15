import express from "express";

const router = express.Router();


// =========================================================
// GET CURRENT LOGGED-IN USER
// =========================================================

router.get("/me", (req, res) => {
  try {
    const authCookie = req.cookies.auth;

    // ---------------------------------------------------------
    // User is not logged in
    // ---------------------------------------------------------

    if (!authCookie) {
      return res.status(401).json({
        success: false,
        message: "Not logged in.",
      });
    }


    // ---------------------------------------------------------
    // Read cookie
    // ---------------------------------------------------------

    const user = JSON.parse(authCookie);


    // ---------------------------------------------------------
    // Return user information
    // ---------------------------------------------------------

    return res.status(200).json({
      success: true,

      user: {
        id: user.id,
        company_id: user.company_id ,
        company_name: user.company_name,
        restaurant_type: user.restaurant_type,
        email: user.email,
        role: Number(user.role),
      },
    });

  } catch (error) {
    console.error("Auth error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid authentication.",
    });
  }
});


export default router;