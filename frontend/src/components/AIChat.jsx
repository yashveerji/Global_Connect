// components/AIChat.js
import React, { useContext, useRef, useState, useEffect } from "react";
import axios from "axios";
import { authDataContext } from "../context/AuthContext";

function AIChat() {
  const { serverUrl } = useContext(authDataContext);
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hi! I’m your Global Connect assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const aiDisabled = Boolean(status);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Add timeout using Axios cancel token
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await axios.post(
        `${serverUrl}/api/ai/chat`,
        { messages: [...messages, userMessage] },
        { withCredentials: true, signal: controller.signal }
      );
      clearTimeout(timeout);
      const aiText = res.data?.reply || "Sorry, I couldn’t respond.";
      setMessages((prev) => [...prev, { from: "ai", text: aiText }]);
    } catch (error) {
      console.error("AI error:", error?.message || error);
      const msg = error?.message?.includes("aborted") ? "Assistant timed out. Please try again." : "Sorry, I couldn’t respond.";
      setMessages((prev) => [...prev, { from: "ai", text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick health check on mount to hint if AI key is missing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/ai/health`, { withCredentials: true });
        if (!cancelled) {
          const { configured, reason } = res.data || {};
          setStatus(configured ? "" : (reason || "AI not configured"));
        }
      } catch {
        if (!cancelled) setStatus("");
      }
    })();
    return () => { cancelled = true; };
  }, [serverUrl]);

  const isOnline = !status;

  return (
    <div className="w-full lg:w-[28%] h-[90vh] mt-[90px] flex flex-col animate-fade-in">
      {/* Card container */}
      <div className="card flex-1 flex flex-col overflow-hidden shadow-elevated">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[var(--gc-border)] flex items-center justify-between bg-[var(--gc-surface)]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white"
                 style={{ background: "var(--gc-primary)" }}>
              GC
            </div>
            <div className="leading-tight">
              <h3 className="font-semibold text-sm sm:text-base">AI Assistant</h3>
              <div className="text-[11px] text-gray-500 dark:text-[var(--gc-muted)]">
                Helpful tips, quick answers, and guidance
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-[10px] font-medium border ${isOnline ? 'bg-green-50 text-green-700 border-green-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'}`}>
            {isOnline ? 'Online' : 'AI Offline'}
          </div>
        </div>

        {/* Offline hint */}
        {status && (
          <div className="px-4 py-2 text-xs bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-b border-amber-100 dark:border-amber-800">
            {status}. You can still browse the app while AI is offline.
          </div>
        )}

        {/* Messages */}
        <div ref={listRef} className="flex-1 p-3 sm:p-4 overflow-y-auto hide-scrollbar flex flex-col gap-2 bg-[var(--gc-surface-soft)] dark:bg-[var(--gc-surface-soft)]">
          {messages.map((msg, i) => {
            const isAi = msg.from === 'ai';
            return (
              <div key={i} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[82%] sm:max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-anywhere shadow-sm ${
                    isAi
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-[#23272F] dark:text-[var(--gc-text)]'
                  }`}
                  style={isAi ? { background: 'var(--gc-primary)' } : {}}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[var(--gc-muted)]">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 animate-pulse" />
              Assistant is typing…
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-[var(--gc-border)] bg-[var(--gc-surface)]">
          <div className="flex items-end gap-2">
            <input
              className="input"
              placeholder="Ask about jobs, connections, profiles, or features…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiDisabled && sendMessage()}
              disabled={loading || aiDisabled}
            />
            <button
              className={`btn-primary h-[42px] flex items-center justify-center ${loading || aiDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              onClick={sendMessage}
              disabled={loading || aiDisabled}
              title={aiDisabled ? 'AI is offline' : 'Send'}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIChat;
