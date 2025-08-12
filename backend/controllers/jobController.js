const Job = require("../models/Job");
const User = require("../models/User");

exports.saveJob = async (req, res) => {
  const user = await User.findById(req.user);
  const jobId = req.params.jobId;

  if (user.savedJobs.includes(jobId)) {
    user.savedJobs = user.savedJobs.filter((id) => id.toString() !== jobId);
    await user.save();
    return res.json({ msg: "Job removed from saved" });
  }

  user.savedJobs.push(jobId);
  await user.save();
  res.json({ msg: "Job saved" });
};

exports.getSavedJobs = async (req, res) => {
  const user = await User.findById(req.user).populate("savedJobs");
  res.json(user.savedJobs);
};


// Post a new job
exports.postJob = async (req, res) => {
  const { title, description, skills, location } = req.body;
  const job = await Job.create({
    postedBy: req.user,
    title,
    description,
    skills,
    location,
  });
  res.status(201).json(job);
};

// Get all jobs
exports.getAllJobs = async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).populate("postedBy", "name");
  res.json(jobs);
};

// Apply to a job
exports.applyToJob = async (req, res) => {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job.applicants.includes(req.user)) {
    job.applicants.push(req.user);
    await job.save();
    res.json({ msg: "Applied successfully" });
  } else {
    res.status(400).json({ msg: "Already applied" });
  }
};
