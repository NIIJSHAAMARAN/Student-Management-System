// Usage: roleMiddleware("admin")  or  roleMiddleware("admin", "trainer")
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    // Safety check: authMiddleware must have run first
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission for this action.",
      });
    }

    next();
  };
};

module.exports = roleMiddleware;