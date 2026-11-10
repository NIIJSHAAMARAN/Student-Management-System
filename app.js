const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const batchRoutes = require("./routes/batchRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

// Security, CORS and body parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL, // only your frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "100kb" }));

// Request logger
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

// Rate limiters (before the routes)
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Health and status
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working",
    data: "Connected",
    status: "Active",
  });
});

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/attendance", attendanceRoutes);

// Errors (always last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;