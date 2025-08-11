const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  getFeed,
  createPost,
  likePost,
  commentPost,
  repost,
} = require("../controllers/postController");

// ✅ GET feed
router.get("/feed", auth, getFeed);

// ✅ POST new post
router.post("/", auth, createPost);

// ✅ Like post
router.put("/like/:postId", auth, likePost);

// ✅ Comment
router.post("/comment/:postId", auth, commentPost);

// ✅ Repost
router.post("/repost/:postId", auth, repost);

module.exports = router;
