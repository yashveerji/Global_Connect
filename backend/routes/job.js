const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// 📌 POST a new job (Admin only)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, company, location, salary } = req.body;

    if (!title || !description || !company || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newJob = new Job({
      title,
      description,
      company,
      location,
      salary,
      postedBy: req.user.id,
    });

    await newJob.save();
    res.status(201).json({ message: "Job posted successfully", job: newJob });
  } catch (error) {
    console.error("Error posting job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 GET all jobs
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 GET single job by ID
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📌 Apply for a job (User only)
router.post("/:id/apply", verifyToken, async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Prevent admin from applying
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot apply for jobs" });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      jobId,
      userId: req.user.id,
    });

    if (existingApplication) {
      return res.status(400).json({ message: "You have already applied" });
    }

    const application = new Application({
      jobId,
      userId: req.user.id,
      status: "Pending",
    });

    await application.save();
    res.status(201).json({ message: "Applied successfully", application });
  } catch (error) {
    console.error("Error applying for job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
