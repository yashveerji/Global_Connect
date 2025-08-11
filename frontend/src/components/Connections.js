import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const Connections = () => {
  const { user, token } = useSelector((state) => state.user);
  const [allUsers, setAllUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const API = process.env.REACT_APP_API_URL;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      const usersRes = await axios.get(`${API}/users`, {
        headers: { Authorization: token },
      });
      setAllUsers(usersRes.data);

      const connRes = await axios.get(`${API}/connections/list`, {
        headers: { Authorization: token },
      });
      setConnections(connRes.data.map((u) => u._id));

      const pendingRes = await axios.get(`${API}/connections/pending`, {
        headers: { Authorization: token },
      });
      setPending(pendingRes.data.map((u) => u._id));
    } catch (err) {
      console.error("❌ Error fetching connections:", err);
      toast.error("Failed to load connections");
    }
  }, [API, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async (toUserId) => {
    try {
      await axios.post(
        `${API}/connections/send`,
        { toUserId },
        { headers: { Authorization: token } }
      );
      toast.success("Connection request sent!");
      setPending((prev) => [...prev, toUserId]);
    } catch (err) {
      console.error("❌ Error sending request:", err);
      toast.error("Request failed");
    }
  };

  const filteredUsers = allUsers
    .filter((u) => u._id !== user._id)
    .filter((u) =>
      u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

  const renderButton = (id) => {
    if (connections.includes(id))
      return (
        <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
          ✅ Connected
        </span>
      );
    if (pending.includes(id))
      return (
        <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold">
          ⏳ Pending
        </span>
      );
    return (
      <button
        onClick={() => handleConnect(id)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
      >
        Connect
      </button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-3xl font-extrabold text-center mb-6 text-indigo-700 tracking-wide">
        🔗 Connections
      </h2>

      <input
        type="text"
        value={search}
        placeholder="Search users by name or email..."
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
      />

      {filteredUsers.length === 0 ? (
        <p className="text-center text-gray-500 text-lg mt-12">
          No users found
        </p>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="bg-white rounded-xl p-5 flex items-center justify-between shadow-md hover:shadow-lg transition"
            >
              <div className="flex items-center gap-4">
                {/* Avatar circle with initials */}
                <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xl font-bold select-none">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">{u.name}</h4>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
              <div>{renderButton(u._id)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Connections;
