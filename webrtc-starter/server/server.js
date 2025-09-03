import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

// Set this to your frontend origin for best security (e.g. https://your-frontend.onrender.com)
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.get("/", (_req, res) => {
  res.send("WebRTC Signaling Server is running ✨");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

function roomPeers(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
}

io.on("connection", (socket) => {
  socket.on("join", ({ roomId }) => {
    if (!roomId) return;
    const count = roomPeers(roomId);
    if (count >= 2) {
      socket.emit("room-full");
      return;
    }
    socket.join(roomId);
    socket.to(roomId).emit("peer-joined", { socketId: socket.id });
    socket.emit("joined", { roomId, peers: count });
  });

  socket.on("offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("offer", { sdp, from: socket.id });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("answer", { sdp, from: socket.id });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("leave", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("peer-left", { socketId: socket.id });
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("peer-left", { socketId: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Signaling server on :${PORT}`));
