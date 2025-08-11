// ✅ src/App.js
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Routes, Route } from "react-router-dom";
import { loginUserSuccess } from "./store/userSlice";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./components/Home";
import About from "./components/About";
import Services from "./components/Services";
import Contact from "./components/Contact";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserProfile from "./components/UserProfile";
import Connections from "./components/Connections";
import Feed from "./components/Feed";
import JobBoard from "./components/JobBoard";
import ChatBox from "./components/ChatBox";
import Messages from "./components/Messages";
import ProtectedRoute from "./components/ProtectedRoute";

// Socket connection
import socket from "./utils/socket";

const App = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  // 🔐 Restore login from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    try {
      if (token && user) {
        dispatch(loginUserSuccess({ token, user: JSON.parse(user) }));
      }
    } catch (err) {
      console.error("❌ Error restoring user from localStorage", err);
    }
  }, [dispatch]);

  // 🔌 Join socket room after login
  useEffect(() => {
    if (user?._id) {
      socket.emit("join", user._id);
      console.log("✅ Joined socket room:", user._id);
    }
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute><JobBoard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatBox /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
