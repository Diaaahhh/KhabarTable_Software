import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import db from "./db.js";

// Import routes
import loginRoutes from "./routes/login.js";
import authRoutes from "./routes/auth.js";
import registrationRouter from "./routes/registration.js";
import sidebarRoutes from "./routes/sidebar.js";
import restaurantCategoryRoutes from "./routes/restaurantCategory.js";
import employeeRouter from "./routes/create_employee.js";
import branchRoutes from "./routes/branch_list.js";
import variantRoutes from "./routes/variant.js";
import menuCategoryRoutes from "./routes/create_menucategory.js";
import menuSubcategoryRoutes from "./routes/create_menu_subcategory.js";
import authorizationRoutes from "./routes/authorization.js";
import createIngredientsRouter from "./routes/create_ingredients.js";
import companyRoutes from "./routes/company.js";
import designationRoutes from "./routes/designation.js";
import packageRoutes from "./routes/package.js";


const app = express();

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(express.json({ limit: "2mb" }));

app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// =========================================================
// CORS
// =========================================================

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// =========================================================
// ROUTES
// =========================================================

app.use("/api/auth", loginRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/registration", registrationRouter);

app.use("/api/sidebar", sidebarRoutes);

app.use("/api/restaurant-category", restaurantCategoryRoutes);

app.use("/api/employees", employeeRouter);

app.use("/api/branches", branchRoutes);

app.use("/api/menu-varient", variantRoutes);

app.use("/api/menu-categories", menuCategoryRoutes);

app.use("/api/menu-subcategories", menuSubcategoryRoutes);

app.use("/api/authorization", authorizationRoutes);

app.use("/api/menu-ingredients", createIngredientsRouter);

app.use("/api/companies", companyRoutes);

app.use("/api/designations", designationRoutes);

app.use("/api/packages", packageRoutes);
// =========================================================
// DATABASE CONNECTION TEST
// =========================================================

db.query("SELECT 1")
  .then(() => {
    console.log("Database Connected!");
  })
  .catch((err) => {
    console.error("DB ERROR:", err);
  });

// =========================================================
// ROOT ROUTE
// =========================================================

app.get("/", (req, res) => {
  res.send("Backend Running");
});

// =========================================================
// START SERVER
// =========================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});