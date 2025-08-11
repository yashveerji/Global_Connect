import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useSelector } from "react-redux";

const socket = io("https://professional-networking-platform.onrender.com", {
  transports: ["websocket"],
  withCredentials: true,
}); // Or use ENV URL

const ChatBox = ({ receiverId }) => {
  const { user } = useSelector((state) => state.user);
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Setup socket listeners
  useEffect(() => {
    if (user?._id) {
      socket.emit("join", user._id);
    }

    socket.on("receive_message", (data) => {
      setMessages((prev) => [
        ...prev,
        { text: data.text, sender: "them", from: data.senderId, timestamp: Date.now() },
      ]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [user._id]);

  // Send message
  const send = () => {
    if (!msg.trim()) return;
    const messageData = {
      senderId: user._id,
      receiverId,
      text: msg,
    };
    socket.emit("send_message", messageData);
    setMessages((prev) => [
      ...prev,
      { text: msg, sender: "me", from: user._id, timestamp: Date.now() },
    ]);
    setMsg("");
  };

  // Format timestamp to hh:mm am/pm
  const formatTime = (ts) => {
    const date = new Date(ts);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="max-w-md mx-auto flex flex-col h-[600px] bg-white rounded-lg shadow-lg border border-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-t-lg text-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">💬</span> Chat
        </h2>
        {/* Placeholder for user info or online status */}
        <div className="text-sm opacity-75">You</div>
      </div>

      {/* Messages Container */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100 scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-gray-200"
        style={{ scrollbarWidth: "thin" }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end max-w-xs ${
              m.sender === "me" ? "ml-auto justify-end" : "mr-auto justify-start"
            }`}
          >
            {/* Sender avatar placeholder */}
            {m.sender !== "me" && (
              <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold mr-2 select-none">
                {m.from?.charAt(0).toUpperCase() || "T"}
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`relative px-4 py-2 rounded-xl shadow-md break-words ${
                m.sender === "me"
                  ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-900 rounded-bl-none border border-gray-300"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>

              {/* Timestamp */}
              <span
                className={`block mt-1 text-xs select-none ${
                  m.sender === "me" ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {formatTime(m.timestamp)}
              </span>

              {/* Little triangle "tail" on bubble */}
              <span
                className={`absolute bottom-0 w-3 h-3 bg-transparent ${
                  m.sender === "me"
                    ? "-right-1 rounded-bl-xl bg-gradient-to-br from-blue-400 to-blue-600"
                    : "-left-1 rounded-br-xl bg-white border border-gray-300 border-l-0 border-t-0"
                }`}
                style={{
                  clipPath:
                    m.sender === "me"
                      ? "polygon(0 100%, 100% 0, 100% 100%)"
                      : "polygon(0 0, 100% 100%, 0 100%)",
                }}
              />
            </div>

            {/* Receiver avatar placeholder */}
            {m.sender === "me" && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold ml-2 select-none">
                You
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-white flex items-center gap-3 rounded-b-lg">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-lg transition-transform active:scale-95"
          aria-label="Send Message"
        >
          {/* Send Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l6-6m0 0l-6-6m6 6H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
