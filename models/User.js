const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
      match: [/^[A-Za-z]+(?: [A-Za-z]+)*$/, "Name can contain only letters and single spaces"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Please enter a valid email address"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false, // never returned by queries unless explicitly requested
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "trainer"],
        message: "Role must be admin or trainer",
      },
      default: "trainer",
    },
  },
  { timestamps: true }
);

// Safety net: strip passwordHash if a document is ever converted to JSON
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema, "users");