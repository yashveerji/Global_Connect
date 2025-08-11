// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    // ✅ Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "No token, access denied" });
    }

    // ✅ Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ msg: "Token verification failed" });
    }

    // ✅ Get user ID from payload
    const userId = decoded.user?.id || decoded.id;
    if (!userId) {
      return res.status(401).json({ msg: "Invalid token payload" });
    }

    // ✅ Fetch user from DB
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    // ✅ Attach user to request
    req.user = user;

    next();
  } catch (err) {
    console.error("❌ Auth Middleware Error:", err.message);
    return res.status(401).json({ msg: "Token is not valid" });
  }
};

module.exports = auth;
