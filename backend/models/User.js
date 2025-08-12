// ✅ Updated models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    profilePic: { type: String, default: "" },
    bio: { type: String },
    resume: { type: String },
    experience: [{ company: String, role: String, from: String, to: String }],
    education: [{ school: String, degree: String, from: String, to: String }],
    skills: [String],
    bannerPic: [String],
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
