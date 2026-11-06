const mongoose = require("mongoose");
const Course = require("../models/Course");

// Shared error handler for create and update
const handleError = (error, res) => {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ success: false, message: "Validation failed", errors: messages });
  }

  if (error.name === "CastError") {
    return res
      .status(400)
      .json({ success: false, message: `Invalid value for ${error.path}` });
  }

  if (error.code === 11000) {
    return res
      .status(409)
      .json({ success: false, message: "Course title already exists" });
  }

  console.error(error);
  res.status(500).json({ success: false, message: "Server error" });
};

// POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const { title, description, durationMonths, fee, status } = req.body;

    const course = await Course.create({
      title,
      description,
      durationMonths,
      fee,
      status,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    handleError(error, res);
  }
};

// GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// GET /api/courses/:id
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    handleError(error, res);
  }
};

// PUT /api/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    const allowedFields = ["title", "description", "durationMonths", "fee", "status"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    const course = await Course.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    handleError(error, res);
  }
};

// DELETE /api/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    handleError(error, res);
  }
};