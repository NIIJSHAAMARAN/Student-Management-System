const mongoose = require("mongoose");

// Usage: router.get("/:id", validateObjectId("id"), controller)
exports.validateObjectId = (...paramNames) => (req, res, next) => {
  for (const name of paramNames) {
    if (!mongoose.isValidObjectId(req.params[name])) {
      return res.status(400).json({ success: false, message: `Invalid ${name}` });
    }
  }
  next();
};