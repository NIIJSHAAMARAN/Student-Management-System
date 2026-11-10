const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("./config/env"); // checks the required variables

const app = require("./app");
const connectDB = require("./config/db");

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