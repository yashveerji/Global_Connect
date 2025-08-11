const Job = require("../models/Job");
const User = require("../models/User");

// Post a new job
exports.postJob = async (req, res) => {
  try {
    const { title, description, skills, location } = req.body;
    if (!title || !description || !skills || !location) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const user = await User.findById(req.user._id);
    if (!["employer", "admin"].includes(user.role)) {
      return res.status(403).json({ msg: "You are not allowed to post jobs" });
    }

    const job = await Job.create({
      postedBy: user._id,
      title,
      description,
      skills,
      location,
    });

    res.status(201).json(job);
  } catch (err) {
    console.error("❌ Error posting job:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .populate("postedBy", "name role")
      .populate("applicants", "name email");
    res.json(jobs);
  } catch (err) {
    console.error("❌ Error fetching jobs:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Apply to a job
exports.applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ msg: "Job not found" });

    if (job.applicants.includes(req.user._id)) {
      return res.status(400).json({ msg: "Already applied" });
    }

    job.applicants.push(req.user._id);
    await job.save();

    res.json({ msg: "Applied successfully" });
  } catch (err) {
    console.error("❌ Error applying to job:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Save / Unsave a job
exports.saveJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const user = await User.findById(req.user._id);

    if (user.savedJobs.includes(jobId)) {
      user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
      await user.save();
      return res.json({ msg: "Job removed from saved" });
    }

    user.savedJobs.push(jobId);
    await user.save();
    res.json({ msg: "Job saved" });
  } catch (err) {
    console.error("❌ Error saving job:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Get saved jobs
exports.getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("savedJobs");
    res.json(user.savedJobs);
  } catch (err) {
    console.error("❌ Error fetching saved jobs:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
