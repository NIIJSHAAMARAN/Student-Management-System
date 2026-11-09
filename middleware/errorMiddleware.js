// 404 for any route that did not match
exports.notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Handles every error passed to next(err) or thrown in a route
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors;

  // Mongoose validation error
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => e.message);
  }
  // Bad ObjectId or type cast
  else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for ${err.path}`;
  }
  // Duplicate key (unique index)
  else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    message = `${field} already exists`;
  }
  // Malformed JSON body
  else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Request body is not valid JSON";
  }

  // Never leak internals for unexpected errors in production
  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") message = "Internal server error";
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (process.env.NODE_ENV !== "production" && status === 500) body.stack = err.stack;

  res.status(status).json(body);
};