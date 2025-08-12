const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  sendRequest,
  acceptRequest,
  getConnections,
  getPendingRequests,
} = require("../controllers/connectionController");

// All routes require authentication
router.post("/send/:id", auth, sendRequest);
router.post("/accept/:id", auth, acceptRequest);
router.get("/list", auth, getConnections);
router.get("/pending", auth, getPendingRequests);

module.exports = router;
