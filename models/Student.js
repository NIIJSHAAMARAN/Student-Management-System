const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema({
name: { type: String, 
   required: true, 
   trim: true , 
   minlength: [2, "Name must be at least 2 characters"],
   maxlength: [50, "Name must be at most 50 characters"],
   match: [/^[A-Za-z]+(?: [A-Za-z]+)*$/, "Name can contain only letters and single spaces"],
   },
email:{ type: String,
   required: true,
   unique: true,
   lowercase: true,  
   match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Please enter a valid email address"] },
phone: {
  type: String,
  trim: true,
  set: (v) => (typeof v === "string" ? v.replace(/[\s-]/g, "") : v), // removes spaces and dashes
  match: [
    /^(?:\+91|91)?[6-9]\d{9}$/,
    "Please enter a valid 10-digit Indian mobile number",
  ],
},
status:{
   type: String,
    default: "Active" }
}, { timestamps: true });
module.exports = mongoose.model("Student", studentSchema);