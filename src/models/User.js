const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, trim: true },
    password: { type: String, required: true, select: false }, // Store password hash
    verified: { type: Boolean, default: false },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }], // Array of Job IDs
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
