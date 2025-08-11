const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// Load .env & connect DB
dotenv.config();
connectDB();

const app = express();

// ✅ Allowed Origins
const allowedOrigins = [
  "https://abhinavshrivastava12.github.io", // GitHub Pages
  "http://localhost:3000",                  // Local Dev
  "https://professional-networking-platform.onrender.com" // Render frontend
];

// ✅ CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

// ✅ Parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use("/api", require("./routes")); // Main API routes
app.use("/api/jobs", require("./routes/job")); // Job routes

// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ API is running fine!" });
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: "Something went wrong on the server." });
});

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Setup WebSocket (Socket.IO)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// ✅ Socket events
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`📶 User ${userId} joined room`);
  });

  socket.on("send_message", (data) => {
    io.to(data.receiverId).emit("receive_message", data);
    console.log(`📤 Message sent from ${data.senderId} to ${data.receiverId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
