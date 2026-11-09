const Student = require("../models/Student");
const { parsePagination, buildMeta } = require("../utils/pagination");
const escapeRegex = require("../utils/escapeRegex");
const STUDENT_STATUSES = ["Active", "Inactive"];
// GET /api/students?search=asha&status=Active&page=1&limit=10
exports.getStudents = async (req, res,next) => {
  try {
    const { search, status } = req.query;

    // 1. Validate page and limit
    const { page, limit, skip, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ success: false, message: error });

    // 2. Build the filter from validated values only
    const filter = {};

    if (status !== undefined) {
      if (!STUDENT_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${STUDENT_STATUSES.join(", ")}`,
        });
      }
      filter.status = status;
    }

    if (search !== undefined) {
      if (typeof search !== "string" || search.trim().length > 50) {
        return res.status(400).json({ success: false, message: "search must be text of up to 50 characters" });
      }
      if (search.trim()) {
        const pattern = new RegExp(escapeRegex(search.trim()), "i"); // case-insensitive
        filter.$or = [{ name: pattern }, { email: pattern }];
      }
    }

    // 3. A trainer sees only students in their own batches
    if (req.user.role === "trainer") {
      const batches = await Batch.find({ trainer: req.user.id }).select("students");
      filter._id = { $in: batches.flatMap((b) => b.students) };
    }

    // 4. Query and count with the same filter
    const [students, total] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Student.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: students.length,
      pagination: buildMeta(total, page, limit),
      data: students,
    });
  } catch (error) {
   res.status(500).json({
      success: false,
      message: error.message,
    });
    
  }
};

exports.getStudentById = async (req, res,next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid student ID",
    });
    
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const student = await Student.create({ name, email });

    res.status(201).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid student ID",
    });
  }
};