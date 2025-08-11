const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: [{ type: String, required: true }],
    location: { type: String, required: true },
    applicants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
