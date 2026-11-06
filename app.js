const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const app = express();

const connectDB = require("./config/db");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const batchRoutes=require("./routes/batchRoutes");
app.use("/api/batches",batchRoutes);
const attendanceRoutes = require("./routes/attendanceRoutes");
app.use("/api/attendance", attendanceRoutes);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    console.log("MongoDB connection established");

    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();