import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import db from "./db.js";

//* import routes here *//
import loginRoutes from "./routes/login.js";
import authRoutes from "./routes/auth.js";
import registrationRoutes from "./routes/registration.js";
import sidebarRoutes from "./routes/sidebar.js";
import restaurantCategoryRoutes from "./routes/restaurantCategory.js";
import employeeRoutes from "./routes/create_employee.js";
import branchRoutes from "./routes/branch_list.js";

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser()); 
app.use("/uploads", express.static("uploads"));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      // "https://frontend.rebarcouplerbd.com",
      // "https://rebarcouplerbd.com",
    // "https://www.rebarcouplerbd.com",
    ],
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );

app.use("/api/auth", loginRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/sidebar", sidebarRoutes);
app.use("/api/restaurant-category", restaurantCategoryRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/branches", branchRoutes);

db.query("SELECT 1")
  .then(() => {
    console.log("Database Connected!");
  })
  .catch((err) => {
    console.log("DB ERROR:", err);
  });

app.get("/", (req, res) => {
  res.send("Backend Running");
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
