const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const run = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  if (await User.exists({ email: ADMIN_EMAIL.toLowerCase() })) {
    console.log("Admin already exists");
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    });
    console.log("Admin created");
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});