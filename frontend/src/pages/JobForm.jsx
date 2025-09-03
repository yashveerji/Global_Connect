import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { authDataContext } from "../context/AuthContext";

export default function JobForm() {
  const [form, setForm] = useState({ title: "", company: "", location: "", type: "", description: "", salaryRange: "" });
  const navigate = useNavigate();
  const { serverUrl } = useContext(authDataContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${serverUrl}/api/jobs/add`, form, { withCredentials: true });
      alert("Job posted successfully");
      navigate("/jobs");
    } catch (err) {
      alert("Failed to post job");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#2C2C2C] flex items-start justify-center pt-24 px-4 pb-12">
      <div className="card w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-yellow-100">Post a Job</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          {["title", "company", "location", "salaryRange"].map((field) => (
            <input
              key={field}
              type="text"
              placeholder={field}
              className="input"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              required={field !== "salaryRange"}
            />
          ))}
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
          >
            <option value="">Select Job Type</option>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Internship</option>
          </select>
          <textarea
            placeholder="Description"
            className="input h-32"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary w-full">
            Post Job
          </button>
        </form>
      </div>
    </div>
  );
}
