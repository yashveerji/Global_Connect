const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { postJob, getAllJobs, applyToJob } = require("../controllers/jobController");
const { saveJob, getSavedJobs } = require("../controllers/jobController");
router.post("/", auth, postJob);
router.get("/", auth, getAllJobs);
router.post("/apply/:jobId", auth, applyToJob);
router.put("/save/:jobId", auth, saveJob);
router.get("/saved", auth, getSavedJobs);

module.exports = router;
