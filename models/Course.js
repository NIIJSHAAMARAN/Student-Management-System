const mongoose = require("mongoose");
const courseSchema = new mongoose.Schema({
    title: { 
        type: String,required:[true, "Course title is required"],
        trim:true , 
        unique:true,
        minlength: [2, "Title must be at least 2 characters"],
        maxlength: [100, "Title must be at most 100 characters"],
        match: [/^[A-Za-z0-9][A-Za-z0-9 .,+#&()\-]*$/,
        "Title contains invalid characters",],
   },
    description: 
    { type: String,
                required: true, trim: true,
        maxlength: [500, "Description must be at most 500 characters"],
            },
durationMonths:
        { type: Number,
        required: [true, "Duration in months is required"],
      min: [1, "Duration must be at least 1 month"],
      max: [60, "Duration must be at most 60 months"],
 },
fee:{type: Number,
      required: [true, "Fee is required"],
      min: [0, "Fee cannot be negative"],
  },
status: { type: String, default: "Active" }
}, { timestamps: true });
module.exports = mongoose.model("Course", courseSchema);