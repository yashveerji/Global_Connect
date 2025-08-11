const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // hashed password

    profilePic: { type: String, default: "" },
    bannerPic: [{ type: String }], // make sure it's array only if required

    bio: String,
    resume: String,

    experience: [
      {
        company: String,
        role: String,
        from: String,
        to: String,
      },
    ],

    education: [
      {
        school: String,
        degree: String,
        from: String,
        to: String,
      },
    ],

    skills: [String],

    // Social connections
    connections: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],

    connectionRequests: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],

    // 💼 Saved jobs
    savedJobs: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Job" }
    ],

    // User role (important for job posting rights)
    role: {
      type: String,
      enum: ["user", "employer", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
