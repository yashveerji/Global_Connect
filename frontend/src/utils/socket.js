import { io } from "socket.io-client";

const socket = io("http://localhost:5000/api", {
  transports: ["polling"], // ✅ Safe for Render
  withCredentials: true,
});

export default socket;
