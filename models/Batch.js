const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: [true, "Batch name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Batch name must be at least 2 characters"],
      maxlength: [100, "Batch name must be at most 100 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Make this required: true after the User model exists (Stage 8)
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value) {
          // Works on create. See the note below for updates.
          return !this.startDate || value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    status: {
      type: String,
      enum: {
        values: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
        message: "Status must be Upcoming, Ongoing, Completed or Cancelled",
      },
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Batch", batchSchema, "batches");