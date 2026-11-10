const mongoose = require("mongoose");
const Batch = require("../models/Batch");
const Course = require("../models/Course");
const Student = require("../models/Student");
const User=require("../models/User");
const Attendance=require("../models/Attendance");
const BATCH_STATUSES = ["Upcoming", "Ongoing", "Completed", "Cancelled"];
const handleError = (error, res) => {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation failed", errors: messages });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid value for ${error.path}` });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "Batch name already exists" });
  }
  console.error(error);
  res.status(500).json({ success: false, message: "Server error" });
};
const populateBatch = (query) =>
  query
    .populate("course", "title durationMonths")
    .populate("students", "name email status");
const checkStudents = async (students) => {
  if (!Array.isArray(students)) {
    return { error: { code: 400, message: "students must be an array of IDs" } };
  }
  const ids = [...new Set(students.map(String))]; // removes duplicates

  if (!ids.every((id) => mongoose.isValidObjectId(id))) {
    return { error: { code: 400, message: "One or more student IDs are invalid" } };
  }
  const found = await Student.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    return { error: { code: 404, message: "One or more students not found" } };
  }
  return { ids };
};

exports.createBatch = async (req, res) => {
  try {
    const { batchName, course, trainer, startDate, endDate, students = [], status } = req.body;

    // 1. Course must exist
    if (!mongoose.isValidObjectId(course)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }
    if (!(await Course.exists({ _id: course }))) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (!mongoose.isValidObjectId(trainer)) {
      return res.status(400).json({ success: false, message: "Invalid trainer ID" });
    }
    if (!(await User.exists({ _id: trainer, role: "trainer" }))) {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }
 
    const result = await checkStudents(students);
    if (result.error) {
      return res.status(result.error.code).json({ success: false, message: result.error.message });
    }

    const batch = await Batch.create({
      batchName,
      course,
       trainer, // TRAINER
      startDate,
      endDate,
      students: result.ids,
      status,
    });

    const saved = await populateBatch(Batch.findById(batch._id));
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getBatches = async (req, res) => {
  try {
    const { course, trainer, status } = req.query;
    const filter = {};
    if (req.user.role === "trainer") {
      filter.trainer = req.user.id; // overrides any ?trainer= sent by the client
   }

    if (course) {
      if (!mongoose.isValidObjectId(course)) {
        return res.status(400).json({ success: false, message: "Invalid course ID" });
      }
      filter.course = course;
    }

    if (trainer) {
      if (!mongoose.isValidObjectId(trainer)) {
        return res.status(400).json({ success: false, message: "Invalid trainer ID" });
      }
      filter.trainer = trainer;
    }

    if (status) {
      if (!BATCH_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${BATCH_STATUSES.join(", ")}`,
        });
      }
      filter.status = status;
    }

    const batches = await populateBatch(Batch.find(filter).sort({ createdAt: -1 }));
    res.status(200).json({ success: true, count: batches.length, data: batches });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const batch = await populateBatch(Batch.findById(id));
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (req.user.role === "trainer" && batch.trainer?._id.toString() !== req.user.id) {
  return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
}
    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    handleError(error, res);
  }
};


exports.updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // 1. Collect only the allowed fields that were sent
    const allowedFields = ["batchName", "course", "trainer", "startDate", "endDate", "status"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    // 2. Validate references BEFORE changing the document
    if (updates.course !== undefined) {
      if (!mongoose.isValidObjectId(updates.course)) {
        return res.status(400).json({ success: false, message: "Invalid course ID" });
      }
      if (!(await Course.exists({ _id: updates.course }))) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }
    }

    if (updates.trainer !== undefined) {
      if (!mongoose.isValidObjectId(updates.trainer)) {
        return res.status(400).json({ success: false, message: "Invalid trainer ID" });
      }
      if (!(await User.exists({ _id: updates.trainer, role: "trainer" }))) {
        return res.status(404).json({ success: false, message: "Trainer not found" });
      }
    }

    // 3. Apply the changes
    Object.assign(batch, updates);
    const outside = await Attendance.exists({
  batch: id,
  $or: [{ date: { $lt: batch.startDate } }, { date: { $gt: batch.endDate } }],
});
if (outside) {
  return res.status(409).json({
    success: false,
    message: "Attendance exists outside the new batch dates",
  });
}
    // 4. Date check (only when both dates are valid)
    const start = new Date(batch.startDate);
    const end = new Date(batch.endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    await batch.save();
    const updated = await populateBatch(Batch.findById(id));
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    handleError(error, res);
  }
};
exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const batch = await Batch.findByIdAndDelete(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    res.status(200).json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    handleError(error, res);
  }
};

exports.addStudentToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (!(await Student.exists({ _id: studentId }))) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (batch.students.some((s) => s.toString() === studentId)) {
      return res.status(409).json({ success: false, message: "Student already in this batch" });
    }

    const updated = await populateBatch(
      Batch.findByIdAndUpdate(id, { $addToSet: { students: studentId } }, { new: true })
    );
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    handleError(error, res);
  }
};

exports.removeStudentFromBatch = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (!batch.students.some((s) => s.toString() === studentId)) {
      return res.status(404).json({ success: false, message: "Student is not in this batch" });
    }

    const updated = await populateBatch(
      Batch.findByIdAndUpdate(id, { $pull: { students: studentId } }, { new: true })
    );
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    handleError(error, res);
  }
};