import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import Nav from "../components/Nav";
import axios from "axios";
import { authDataContext } from "../context/AuthContext";
import dp from "../assets/dp.webp";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { RxCrossCircled } from "react-icons/rx";
import { FiUserX } from "react-icons/fi";
import io from "socket.io-client";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { useToastInternal } from "../components/ui/ToastProvider";

import { useNavigate } from "react-router-dom";

function Network() {
  const { serverUrl } = useContext(authDataContext);
  const confirm = useConfirm();
  const toast = useToastInternal();

  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadingConn, setLoadingConn] = useState(true);
  const [qReqRaw, setQReqRaw] = useState("");
  const [qConnRaw, setQConnRaw] = useState("");
  const [qReq, setQReq] = useState("");
  const [qConn, setQConn] = useState("");
  const [busyBulk, setBusyBulk] = useState(false);
  const reqDebRef = useRef();
  const connDebRef = useRef();
  // removed local toast state (using ToastProvider)

  // Socket setup
  useEffect(() => {
    const socket = io(serverUrl, { withCredentials: true });

    // Some backends emit granular events; our controllers emit `statusUpdate`.
    socket.on("newRequest", (newReq) => setRequests((prev) => [...prev, newReq]));
    socket.on("requestAccepted", () => { fetchConnections(); fetchRequests(); });
    socket.on("connectionRemoved", (id) => setConnections((prev) => prev.filter((c) => c._id !== id)));
    socket.on("statusUpdate", ({ newStatus }) => {
      if (newStatus === "connect") fetchConnections();
      if (newStatus === "pending" || newStatus === "received") fetchRequests();
    });

    return () => socket.disconnect();
  }, [serverUrl]);

  // Fetch pending requests
  const fetchRequests = async () => {
    try {
      setLoadingReq(true);
      const res = await axios.get(`${serverUrl}/api/connection/requests`, {
        withCredentials: true,
      });
      console.log("Requests API response:", res.data);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
  toast?.error("Failed to load invitations.");
    } finally {
      setLoadingReq(false);
    }
  };

  // Fetch accepted connections (fixed endpoint)
  const fetchConnections = async () => {
    try {
      setLoadingConn(true);
      const res = await axios.get(`${serverUrl}/api/connection/`, {
        withCredentials: true,
      });
      console.log("Connections API response:", res.data);
      setConnections(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
  toast?.error("Failed to load connections.");
    } finally {
      setLoadingConn(false);
    }
  };

  // Accept a connection request
  const handleAccept = async (id) => {
    try {
      await axios.put(`${serverUrl}/api/connection/accept/${id}`, {}, { withCredentials: true });
      fetchRequests();
      fetchConnections();
  toast?.success("Invitation accepted.");
    } catch (err) {
      console.error(err);
  toast?.error("Could not accept. Try again.");
    }
  };

  // Reject a connection request
  const handleReject = async (id) => {
    try {
      await axios.put(`${serverUrl}/api/connection/reject/${id}`, {}, { withCredentials: true });
      fetchRequests();
  toast?.success("Invitation ignored.");
    } catch (err) {
      console.error(err);
  toast?.error("Could not ignore. Try again.");
    }
  };

  const handleRemoveConnection = async (userId, displayName) => {
    const ok = await confirm({ title: 'Remove connection', message: `Remove connection with ${displayName || 'this user'}?`, confirmText: 'Remove', cancelText: 'Cancel' });
    if (!ok) return; // note: our confirm resolves on OK; here we simulate boolean by checking resolution
    // optimistic remove
    const prev = connections;
    setConnections((p) => p.filter((c) => c._id !== userId));
    try {
      await axios.delete(`${serverUrl}/api/connection/remove/${userId}`, { withCredentials: true });
      toast?.success(`Removed ${displayName || "connection"}.`);
    } catch (err) {
      console.error(err);
      setConnections(prev);
      toast?.error("Failed to remove. Please try again.");
    }
  };

  const handleAcceptAll = async () => {
    if (!requests.length) return;
    const ok = await confirm({ title: 'Accept all invitations', message: `Accept ${requests.length} invitation${requests.length>1?'s':''}?`, confirmText: 'Accept all', cancelText: 'Cancel' });
    if (!ok) return;
    setBusyBulk(true);
    try {
      for (const r of requests) {
        try { await axios.put(`${serverUrl}/api/connection/accept/${r._id}`, {}, { withCredentials: true }); } catch {}
      }
      await fetchRequests();
      await fetchConnections();
      toast?.success("Accepted all invitations.");
    } finally {
      setBusyBulk(false);
    }
  };
  const handleRejectAll = async () => {
    if (!requests.length) return;
    const ok = await confirm({ title: 'Ignore all invitations', message: `Ignore ${requests.length} invitation${requests.length>1?'s':''}?`, confirmText: 'Ignore all', cancelText: 'Cancel' });
    if (!ok) return;
    setBusyBulk(true);
    try {
      for (const r of requests) {
        try { await axios.put(`${serverUrl}/api/connection/reject/${r._id}`, {}, { withCredentials: true }); } catch {}
      }
      await fetchRequests();
      toast?.success("Ignored all invitations.");
    } finally {
      setBusyBulk(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!qReq.trim()) return requests;
    const q = qReq.toLowerCase();
    return requests.filter((r) => {
      const name = [r.sender?.firstName, r.sender?.lastName].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q);
    });
  }, [qReq, requests]);
  const filteredConnections = useMemo(() => {
    if (!qConn.trim()) return connections;
    const q = qConn.toLowerCase();
    return connections.filter((c) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || (c.userName || '').toLowerCase().includes(q);
    });
  }, [qConn, connections]);

  useEffect(() => {
    fetchRequests();
    fetchConnections();
  }, []);

  // Debounce search inputs for smoother filtering
  useEffect(() => {
    if (reqDebRef.current) clearTimeout(reqDebRef.current);
    reqDebRef.current = setTimeout(() => setQReq(qReqRaw.trim()), 180);
    return () => { if (reqDebRef.current) clearTimeout(reqDebRef.current); };
  }, [qReqRaw]);
  useEffect(() => {
    if (connDebRef.current) clearTimeout(connDebRef.current);
    connDebRef.current = setTimeout(() => setQConn(qConnRaw.trim()), 180);
    return () => { if (connDebRef.current) clearTimeout(connDebRef.current); };
  }, [qConnRaw]);

  return (
  <div className="w-full min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#23243a] dark:from-[#121212] dark:to-[#121212] flex flex-col items-center text-white dark:text-white animate-fade-in">
      <div className="fixed top-0 w-full z-50">
        <Nav />
      </div>

      <div className="w-full max-w-[1000px] mt-[90px] px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
  {/* Toasts handled globally by ToastProvider */}
  <div className="flex items-end justify-between">
          <div className="text-white">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white dark:text-[var(--gc-heading)]">My Network</h1>
            <div className="mt-1 h-0.5 w-12 rounded bg-[var(--gc-primary)]/80"></div>
            <p className="mt-2 text-sm text-white/90 dark:text-white/90">Manage invitations and connections</p>
          </div>
          <div className="text-right text-sm">
            <div className="chip bg-white/90 dark:bg-white/10 dark:border-[#2C2F36] dark:text-white">Invitations: <span className="font-semibold ml-1">{requests.length}</span></div>
            <div className="chip mt-1 bg-white/90 dark:bg-white/10 dark:border-[#2C2F36] dark:text-white">Connections: <span className="font-semibold ml-1">{connections.length}</span></div>
          </div>
        </div>

        {/* Invitations */}
  <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36] animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-lg font-semibold text-gray-900 dark:text-[var(--gc-heading)]">Invitations</span>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <input
                value={qReqRaw}
                onChange={(e) => setQReqRaw(e.target.value)}
                placeholder="Search invitations"
                className="input h-9 py-1.5 min-w-[160px] flex-1 w-full"
              />
              <button className="btn-primary h-9 text-sm shrink-0 whitespace-nowrap" onClick={handleAcceptAll} disabled={busyBulk || requests.length === 0} aria-label="Accept all invitations">Accept all</button>
              <button className="btn-secondary h-9 text-sm shrink-0 whitespace-nowrap" onClick={handleRejectAll} disabled={busyBulk || requests.length === 0} aria-label="Ignore all invitations">Ignore all</button>
            </div>
          </div>
        </div>

        {loadingReq ? (
          <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36]">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-[#2C2F36]" />
                  <div className="h-4 rounded w-40 bg-gray-100 dark:bg-[#2C2F36]" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36] divide-y divide-gray-200 dark:divide-[#2C2F36] animate-scale-in">
            {filteredRequests.map((req) => (
              <div key={req._id} className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4 sm:gap-6">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-300 dark:border-[#2C2F36] shrink-0">
                    <img
                      src={req.sender?.profileImage || dp}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-base sm:text-lg font-medium truncate break-words dark:text-white" title={[req.sender?.firstName, req.sender?.lastName].filter(Boolean).join(" ") || ''}>
                    {[req.sender?.firstName, req.sender?.lastName].filter(Boolean).join(" ")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-primary h-9 text-sm flex items-center gap-2 px-4"
                    onClick={() => handleAccept(req._id)}
                  >
                    <IoIosCheckmarkCircleOutline className="w-5 h-5" /> Accept
                  </button>
                  <button
                    className="btn-secondary h-9 text-sm flex items-center gap-2 px-4"
                    onClick={() => handleReject(req._id)}
                  >
                    <RxCrossCircled className="w-5 h-5" /> Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36] text-center py-10">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 dark:bg-[#161616] flex items-center justify-center mb-3">
              <IoIosCheckmarkCircleOutline className="w-7 h-7 text-[#0A66C2]" />
            </div>
            <div className="text-base font-medium dark:text-white">No new invitations</div>
            <div className="text-sm text-gray-600 dark:text-white/80">You’re all caught up. Discover more people to connect with.</div>
            <div className="mt-4">
              <button className="btn-primary" onClick={() => navigate('/')}>Discover people</button>
            </div>
          </div>
        )}

        {/* Connections */}
  <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36] mt-2 animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-lg font-semibold text-gray-900 dark:text-[var(--gc-heading)]">My Connections</span>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <input
                value={qConnRaw}
                onChange={(e) => setQConnRaw(e.target.value)}
                placeholder="Search connections"
                className="input h-9 py-1.5 min-w-[160px] flex-1 w-full"
              />
              <span className="chip bg-white/90 dark:bg-transparent dark:border-[#2C2F36] dark:text-white/80 shrink-0 whitespace-nowrap">{filteredConnections.length} of {connections.length}</span>
            </div>
          </div>
        </div>

        {loadingConn ? (
          <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36] animate-scale-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded border border-gray-200 dark:border-[#2C2F36] animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2C2F36]" />
                  <div className="h-4 rounded w-32 bg-gray-100 dark:bg-[#2C2F36]" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredConnections.length > 0 ? (
          <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredConnections.map((conn) => (
                <div key={conn._id} className="group flex items-center gap-3 p-3 rounded border border-gray-200 dark:border-[#2C2F36] hover:border-blue-300 dark:hover:border-[#3A3F46] hover:bg-blue-50 dark:hover:bg-[#161616] transition hover-lift">
                  <button className="flex items-center gap-3 flex-1 text-left" onClick={() => navigate(`/profile/${conn.userName}`)} title="View Profile">
                    <span className="relative">
                      <img src={conn.profileImage || dp} alt="" className="w-12 h-12 rounded-full border border-gray-200 dark:border-[#2C2F36]" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-medium group-hover:text-blue-800 dark:text-white dark:group-hover:text-blue-300">
                        {[conn.firstName, conn.lastName].filter(Boolean).join(" ")}
                      </span>
                      {conn.headline && (
                        <span className="text-xs text-white/70 line-clamp-1">{conn.headline}</span>
                      )}
                    </span>
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    title="Remove connection"
                    onClick={() => handleRemoveConnection(conn._id, [conn.firstName, conn.lastName].filter(Boolean).join(" "))}
                  >
                    <FiUserX />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card dark:bg-[#1E1E1E] dark:border-[#2C2F36] text-center py-10">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 dark:bg-[#161616] flex items-center justify-center mb-3">
              <FiUserX className="w-7 h-7 text-[#0A66C2]" />
            </div>
            <div className="text-base font-medium dark:text-white">You have no connections yet</div>
            <div className="text-sm text-gray-600 dark:text-white/80">Start by sending invitations to people you know.</div>
            <div className="mt-4">
              <button className="btn-primary" onClick={() => navigate('/')}>Find people</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Network;
