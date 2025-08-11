const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinary");
const auth = require("../middleware/authMiddleware");

// ✅ Image Upload
router.post("/image", auth, upload.single("image"), (req, res) => {
  res.json({ url: req.file.path });
});

// ✅ Resume Upload (PDF)
router.post("/resume", auth, upload.single("resume"), (req, res) => {
  if (!req.file || !req.file.path.endsWith(".pdf")) {
    return res.status(400).json({ error: "Only PDF resumes allowed" });
  }
  res.json({ url: req.file.path });
});

module.exports = router;
