const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Message = require("../models/Message");

router.get("/:receiverId", auth, async (req, res) => {
  const { receiverId } = req.params;
  const messages = await Message.find({
    $or: [
      { senderId: req.user, receiverId },
      { senderId: receiverId, receiverId: req.user }
    ]
  }).sort({ createdAt: 1 });
  res.json(messages);
});

module.exports = router;
