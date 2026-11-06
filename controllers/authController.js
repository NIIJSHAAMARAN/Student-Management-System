const jwt=require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
const SALT_ROUNDS = 10;

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // The role is NOT read from req.body. Public registration is always "trainer".

    // 1. Validate input
    const errors = [];

    if (typeof name !== "string" || !name.trim()) {
      errors.push("Name is required");
    } else if (name.trim().length < 2 || name.trim().length > 50) {
      errors.push("Name must be 2 to 50 characters");
    } else if (!NAME_REGEX.test(name.trim())) {
      errors.push("Name can contain only letters and single spaces");
    }

    if (typeof email !== "string" || !email.trim()) {
      errors.push("Email is required");
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.push("Please enter a valid email address");
    }

    if (typeof password !== "string" || !password) {
      errors.push("Password is required");
    } else if (!PASSWORD_REGEX.test(password)) {
      errors.push("Password must be 8 to 64 characters and contain at least one letter and one number");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    // 2. Check for an existing user
    const cleanEmail = email.trim().toLowerCase();
    if (await User.exists({ email: cleanEmail })) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // 3. Hash the password. Never save the plain one.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: "trainer",
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: "Validation failed", errors: messages });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic input checks (also protects bcrypt from non-string input)
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // 2. Find the user. passwordHash is hidden by default, so ask for it.
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");

    // 3. Compare. Run bcrypt even if the user is missing, so response time doesn't reveal it.
    const isMatch = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user || !isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // 4. Sign a token with the id and role
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in .env");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    // 5. Respond with the token and safe user fields only
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
