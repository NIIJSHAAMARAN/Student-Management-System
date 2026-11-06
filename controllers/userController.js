const mongoose = require("mongoose");
const User = require("../models/User");

const ROLES = ["admin", "trainer"];

// GET /api/users?role=trainer
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};

    if (role) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${ROLES.join(", ")}`,
        });
      }
      filter.role = role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};