const express = require("express");
const router = express.Router();

// ✅ POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Missing credentials" });
  }

  // Accept any email/password (mock login)
  return res.status(200).json({
    user: { name: "Demo User", email },
    token: "mock-token-123",
  });
});

// ✅ POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  return res.status(201).json({
    user: { name, email },
    msg: "User registered successfully",
  });
});

module.exports = router;
