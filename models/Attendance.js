const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"], // always stored as midnight UTC
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Present", "Absent", "Late", "Leave"],
        message: "Status must be Present, Absent, Late or Leave",
      },
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "markedBy is required"],
    },
  },
  { timestamps: true }
);

// One record per student, batch and calendar date
attendanceSchema.index({ student: 1, batch: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema, "attendances");