import { io } from "socket.io-client";

const socket = io("https://global-connect-p93z.onrender.com/api", {
  transports: ["polling"], // ✅ Safe for Render
  withCredentials: true,
});

export default socket;
