const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Batch = require("../models/Batch");
const Student=require("../models/Student");
const normalizeDate = require("../utils/normalizeDate");
const { canAccessBatch, getTrainerBatchIds } = require("../utils/batchAccess");
const { summarize } = require("../utils/attendanceReport");
const STATUSES = ["Present", "Absent", "Late", "Leave"];
const toDay = (d) => d.toISOString().slice(0, 10);
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
    if (day < start || day > end) {
  return res.status(400).json({
    success: false,
    message: `Date must be between ${toDay(batch.startDate)} and ${toDay(batch.endDate)} (inclusive)`,
  });
}
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

if (day < start || day > end) {
  return res.status(400).json({
    success: false,
    message: `Date must be between ${toDay(batch.startDate)} and ${toDay(batch.endDate)} (inclusive)`,
  });
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
    const batch = await Batch.findById(batchId).select("students trainer startDate endDate");
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // 3. Only admin or the assigned trainer
    if (!(await canAccessBatch(req.user, batchId))) {
      return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
    }
    const start = normalizeDate(toDay(batch.startDate));
const end = normalizeDate(toDay(batch.endDate));
   
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
    if (day < normalizeDate(toDay(batch.startDate))) {
  return res.status(400).json({
    success: false,
    message: `Attendance date cannot be before the batch start date (${toDay(batch.startDate)})`,
  });
}

if (day > normalizeDate(toDay(batch.endDate))) {
  return res.status(400).json({
    success: false,
    message: `Attendance date cannot be after the batch end date (${toDay(batch.endDate)})`,
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
// Builds a date filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD (both optional)
const buildDateRange = (from, to) => {
  const range = {};
  if (from) {
    const d = normalizeDate(from);
    if (!d) return { error: "from must be a real date in YYYY-MM-DD format" };
    range.$gte = d;
  }
  if (to) {
    const d = normalizeDate(to);
    if (!d) return { error: "to must be a real date in YYYY-MM-DD format" };
    range.$lte = d;
  }
  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    return { error: "from must not be after to" };
  }
  return { range: Object.keys(range).length ? range : null };
};
// GET /api/attendance/student/:studentId?batch=&from=&to=
exports.getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { batch, from, to } = req.query;

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    const student = await Student.findById(studentId).select("name email");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const filter = { student: studentId };

    if (batch) {
      if (!mongoose.isValidObjectId(batch)) {
        return res.status(400).json({ success: false, message: "Invalid batch ID" });
      }
      if (!(await canAccessBatch(req.user, batch))) {
        return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
      }
      filter.batch = batch;
    } else if (req.user.role === "trainer") {
      // A trainer may see only students in their own batches, and only those records
      const myBatchIds = await getTrainerBatchIds(req.user.id);
      const inMyBatch = await Batch.exists({ _id: { $in: myBatchIds }, students: studentId });
      if (!inMyBatch) {
        return res.status(403).json({ success: false, message: "Access denied. Not your student." });
      }
      filter.batch = { $in: myBatchIds };
    }

    const { error, range } = buildDateRange(from, to);
    if (error) return res.status(400).json({ success: false, message: error });
    if (range) filter.date = range;

       const records = await Attendance.find(filter).select("status date").sort({ date: 1 });

    // Period actually covered by the records (records are sorted by date)
    const period =
      records.length > 0
        ? {
            from: toDay(records[0].date),
            to: toDay(records[records.length - 1].date),
          }
        : { from: null, to: null };

    res.status(200).json({
      success: true,
      data: {
        student,
        period,
        summary: summarize(records),
      },
    });
  } catch (error) {
    handleError(error, res);
  }
};
// GET /api/attendance/batch/:batchId?from=&to=
exports.getBatchReport = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { from, to } = req.query;

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const batch = await Batch.findById(batchId)
      .select("batchName students")
      .populate("students", "name email");
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    if (!(await canAccessBatch(req.user, batchId))) {
      return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
    }

    const filter = { batch: batchId };
    const { error, range } = buildDateRange(from, to);
    if (error) return res.status(400).json({ success: false, message: error });
    if (range) filter.date = range;

    const records = await Attendance.find(filter).select("student status date").sort({date:1});
    const period =
      records.length > 0
        ? { from: toDay(records[0].date), to: toDay(records[records.length - 1].date) }
        : { from: null, to: null };

    // Group records by student
    const byStudent = new Map();
    for (const r of records) {
      const key = r.student.toString();
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key).push(r);
    }

    // One row per current student, including students with no records yet
    const students = batch.students.map((s) => ({
      student: { _id: s._id, name: s.name, email: s.email },
      summary: summarize(byStudent.get(s._id.toString()) || []),
    }));

    res.status(200).json({
      success: true,
      data: {
        batch: { _id: batch._id, batchName: batch.batchName },
        period, overall: summarize(records),
        students,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
};
// controllers/attendanceController.js
exports.getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid attendance ID" });
    }

    const record = await populateAttendance(Attendance.findById(id));
    if (!record) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    if (!(await canAccessBatch(req.user, record.batch._id))) {
      return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    handleError(error, res);
  }
};
// GET /api/attendance/batch/:batchId/aggregate?from=&to=
exports.getBatchReportAggregate = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { from, to } = req.query;

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID" });
    }

    const batch = await Batch.findById(batchId)
      .select("batchName students")
      .populate("students", "name email");
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    if (!(await canAccessBatch(req.user, batchId))) {
      return res.status(403).json({ success: false, message: "Access denied. Not your batch." });
    }

    const { error, range } = buildDateRange(from, to);
    if (error) return res.status(400).json({ success: false, message: error });

    // IMPORTANT: aggregate() does NOT cast strings to ObjectId, so convert it yourself
    const match = { batch: new mongoose.Types.ObjectId(batchId) };
    if (range) match.date = range;

    const rows = await Attendance.aggregate([
      // 1. $match: keep only this batch's records (and the date range)
      { $match: match },

      // 2. $group: one row per student, counting each status
      {
        $group: {
          _id: "$student",
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          leave:   { $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] } },
          total:   { $sum: 1 },
          firstDate: { $min: "$date" },
          lastDate:  { $max: "$date" },
        },
      },

      // 3. $project: add attended, counted and the percentage
      {
        $project: {
          _id: 0,
          student: "$_id",
          present: 1, absent: 1, late: 1, leave: 1, total: 1,
          firstDate: 1, lastDate: 1,
          attended: { $add: ["$present", "$late"] },
          counted: { $subtract: ["$total", "$leave"] },
        },
      },
      {
        $addFields: {
          attendancePercentage: {
            $cond: [
              { $gt: ["$counted", 0] },
              { $round: [{ $multiply: [{ $divide: ["$attended", "$counted"] }, 100] }, 2] },
              null,
            ],
          },
        },
      },
    ]);

    // Attach student names in JavaScript (the $lookup version comes later)
    const byStudent = new Map(rows.map((r) => [r.student.toString(), r]));
    const empty = { present: 0, absent: 0, late: 0, leave: 0, total: 0, attended: 0, counted: 0, attendancePercentage: null };

    const students = batch.students.map((s) => {
      const r = byStudent.get(s._id.toString());
      const { student, firstDate, lastDate, ...summary } = r || empty;
      return { student: { _id: s._id, name: s.name, email: s.email }, summary };
    });

    const dates = rows.flatMap((r) => [r.firstDate, r.lastDate]).filter(Boolean);
    const period = dates.length
      ? {
          from: toDay(new Date(Math.min(...dates))),
          to: toDay(new Date(Math.max(...dates))),
        }
      : { from: null, to: null };

    res.status(200).json({
      success: true,
      data: { batch: { _id: batch._id, batchName: batch.batchName }, period, students },
    });
  } catch (error) {
    handleError(error, res);
  }
};