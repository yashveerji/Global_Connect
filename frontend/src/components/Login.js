import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { loginUser } from "../store/userSlice";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { LockClosedIcon } from "@heroicons/react/24/solid";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("❗ Please enter both email and password");
      return;
    }

    try {
      const res = await dispatch(loginUser({ email, password })).unwrap();
      toast.success(`✅ Welcome, ${res.user.name}!`);
      navigate("/feed");
    } catch (err) {
      console.error("Login error:", err);
      if (err?.msg === "Invalid credentials") {
        toast.error("❌ Incorrect email or password");
      } else if (err?.response?.status === 404) {
        toast.error("❌ Server not found (404)");
      } else if (err?.response?.status === 401) {
        toast.error("❌ Unauthorized (401)");
      } else {
        toast.error("⚠️ Login failed. Try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md relative z-50">
        <div className="flex items-center justify-center mb-6">
          <LockClosedIcon className="h-10 w-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login to Your Account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Email</label>
            <input
              type="email"
              autoComplete="off"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Password</label>
            <input
              type="password"
              autoComplete="off"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
