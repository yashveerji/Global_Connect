import { io } from "socket.io-client";

const socket = io("https://professional-networking-platform.onrender.com", {
  transports: ["polling"], // ✅ Safe for Render
  withCredentials: true,
});

export default socket;
