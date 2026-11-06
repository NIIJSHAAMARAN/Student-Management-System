const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Read the header: "Authorization: Bearer <token>"
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required. Token missing." });
    }

    const token = header.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required. Token missing." });
    }

    // 2. Verify signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Token expired. Please log in again." });
      }
      return res.status(401).json({ success: false, message: "Invalid token." });
    }

    // 3. Load the user from the database (passwordHash is hidden by select: false)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists." });
    }

    // 4. Attach safe details. The role comes from the database, not from the client.
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = authMiddleware;