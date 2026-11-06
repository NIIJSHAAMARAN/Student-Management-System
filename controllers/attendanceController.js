const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Batch = require("../models/Batch");
const normalizeDate = require("../utils/normalizeDate");
const { canAccessBatch, getTrainerBatchIds } = require("../utils/batchAccess");

const STATUSES = ["Present", "Absent", "Late", "Leave"];

const handleError = (error, res) => {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation failed", errors: messages });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "Attendance already marked for this student, batch and date" });
  }
  console.error(error);
  res.status(500).json({ success: false, message: "Server error" });
};

const populateAttendance = (query) =>
  query
    .populate("student", "name email")
    .populate("batch", "batchName")
    .populate("markedBy", "name role");

// POST /api/attendance/mark
// body: { "batchId": "...", "date": "2026-11-04",
//         "records": [ { "studentId": "...", "status": "Present" } ] }
exports.markAttendance = async (req, res) => {
  try {
    const { batchId, date, records } = req.body;

    // 1. Validate input
    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }
    const day = normalizeDate(date);
    if (!day) {
      return res.status(400).json({ success: false, message: "Date must be a real date in YYYY-MM-DD format" });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "records must be a non-empty array" });
    }

    const seen = new Set();
    for (const r of records) {
      if (!r || !mongoose.isValidObjectId(r.studentId)) {
        return res.status(400).json({ success: false, message: "Invalid student ID in records" });
      }
      if (!STATUSES.includes(r.status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(", ")}` });
      }
      if (seen.has(String(r.studentId))) {
        return res.status(400).json({ success: false, message: "Duplicate student in records" });
      }
      seen.add(String(r.studentId));
    }

    // 2. Batch must exist
    const batch = await Batch.findById(batchId).select("students trainer");
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // 3. Only admin or the assigned trainer
    if (!(await canAccessBatch(req.user, batchId))) {
      return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
    }

    // 4. Every student must belong to this batch
    const members = new Set(batch.students.map(String));
    const outsiders = [...seen].filter((id) => !members.has(id));
    if (outsiders.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some students do not belong to this batch",
        studentIds: outsiders,
      });
    }

    // 5. Reject records that already exist (use PUT to correct them)
    const existing = await Attendance.find({
      batch: batchId,
      date: day,
      student: { $in: [...seen] },
    }).select("student");
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for some students. Use PUT /api/attendance/:id to correct it.",
        studentIds: existing.map((e) => e.student),
      });
    }
// if (error.code === 11000) {
// return res.status(409).json({ success: false, message: "Attendance already marked for this student, batch and date" });
// }
    // 6. Save
    const docs = records.map((r) => ({
      student: r.studentId,
      batch: batchId,
      date: day,
      status: r.status,
      markedBy: req.user.id,
    }));
    const created = await Attendance.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${created.length} student(s)`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// GET /api/attendance?batch=&student=&date=&status=
exports.getAttendance = async (req, res) => {
  try {
    const { batch, student, date, status } = req.query;
    const filter = {};

    if (batch) {
      if (!mongoose.isValidObjectId(batch)) {
        return res.status(400).json({ success: false, message: "Invalid batch ID" });
      }
      if (!(await canAccessBatch(req.user, batch))) {
        return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
      }
      filter.batch = batch;
    } else if (req.user.role === "trainer") {
      // No batch given: limit a trainer to their own batches
      filter.batch = { $in: await getTrainerBatchIds(req.user.id) };
    }

    if (student) {
      if (!mongoose.isValidObjectId(student)) {
        return res.status(400).json({ success: false, message: "Invalid student ID" });
      }
      filter.student = student;
    }
    if (date) {
      const day = normalizeDate(date);
      if (!day) {
        return res.status(400).json({ success: false, message: "Date must be YYYY-MM-DD" });
      }
      filter.date = day;
    }
    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(", ")}` });
      }
      filter.status = status;
    }

    const records = await populateAttendance(Attendance.find(filter).sort({ date: -1 }));
    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    handleError(error, res);
  }
};

// PUT /api/attendance/:id   body: { "status": "Late" }
// Only the status can be corrected. Student, batch and date never change,
// because changing them could break the one-record-per-day rule.
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance ID" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(", ")}` });
    }

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    if (!(await canAccessBatch(req.user, record.batch))) {
      return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
    }

    record.status = status;
    record.markedBy = req.user.id; // records who made the latest correction
    await record.save();

    const updated = await populateAttendance(Attendance.findById(id));
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    handleError(error, res);
  }
};