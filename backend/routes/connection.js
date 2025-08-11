const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  sendRequest,
  acceptRequest,
  getConnections,
  getPendingRequests,
} = require("../controllers/connectionController");

// ✅ Send a connection request
router.post("/send", auth, sendRequest);

// ✅ Accept a connection request
router.post("/accept", auth, acceptRequest);

// ✅ Get all connected users
router.get("/list", auth, getConnections);

// ✅ Get all pending connection requests
router.get("/pending", auth, getPendingRequests);

module.exports = router;
