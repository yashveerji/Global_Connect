// src/pages/JobBoard.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const JobBoard = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Backend API ka base URL
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // Jobs fetch karna
  const fetchJobs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/jobs`);
      setJobs(res.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch jobs");
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Apply job function
  const handleApply = async (jobId) => {
    if (!user) {
      setMessage("Please login to apply for jobs.");
      return;
    }

    if (user.role === "admin") {
      setMessage("Admins cannot apply for jobs.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/jobs/${jobId}/apply`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage("Application submitted successfully!");
    } catch (err) {
      setMessage("Error applying for the job.");
    }
  };

  if (loading) return <p className="text-center mt-5">Loading jobs...</p>;
  if (error) return <p className="text-center text-red-500 mt-5">{error}</p>;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Available Jobs</h1>

      {message && (
        <p className="mb-4 text-center text-green-600 font-semibold">{message}</p>
      )}

      {jobs.length === 0 ? (
        <p>No jobs available right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white shadow-md rounded-lg p-4 border hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-600">{job.company}</p>
              <p className="text-gray-500 text-sm">{job.location}</p>
              <p className="mt-2">{job.description}</p>
              <p className="mt-2 font-semibold text-green-600">
                Salary: {job.salary || "Not specified"}
              </p>
              <p className="text-sm mt-1 text-gray-500">
                Posted on: {new Date(job.createdAt).toLocaleDateString()}
              </p>

              <button
                onClick={() => handleApply(job._id)}
                disabled={user?.role === "admin"}
                className={`mt-3 px-4 py-2 rounded text-white ${
                  user?.role === "admin"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Apply Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobBoard;
