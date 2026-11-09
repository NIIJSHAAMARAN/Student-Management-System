const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("./config/env");   // checks the required variables
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const app = express();
const connectDB = require("./config/db");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const batchRoutes=require("./routes/batchRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");



app.use(helmet())
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});


app.use(
  cors({
    origin: process.env.CLIENT_URL,   // only your frontend, never "*" with credentials
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/batches",batchRoutes);
app.use("/api/attendance", attendanceRoutes);

// ...all routes above...

app.use(notFound);
app.use(errorHandler);
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