// ChatBox.jsx

import React, { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../../context/UserContext";
import { authDataContext } from "../../context/AuthContext";
import { useConnections } from "../../hooks/useConnections";
import dp from "../../assets/dp.webp";
import axios from "axios";
import { FiPhone, FiVideo, FiPaperclip, FiMoreVertical, FiBellOff, FiArchive, FiSend, FiCheck, FiUploadCloud } from "react-icons/fi";
import CallWindow from "./CallWindow";
import { useConfirm } from "../ui/ConfirmDialog";
import { useToastInternal } from "../ui/ToastProvider";
import { bust } from "../../utils/image";
import { editMessageHttp, deleteMessageHttp, reactMessageHttp } from "../../api/chat";
import { REACTIONS } from "../Reactions";

function ChatBox() {
  const { userData, socket, chatUnreadCount, setChatUnreadCount } = useContext(userDataContext);
  const { serverUrl } = useContext(authDataContext);
  const confirm = useConfirm?.() || null;
  const toast = useToastInternal?.() || null;
  const navigate = useNavigate();
  const [receiverId, setReceiverId] = useState("");
  const [receiverObj, setReceiverObj] = useState(null);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const [chat, setChat] = useState([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyCursor, setHistoryCursor] = useState(null); // ISO date
  // message edit state
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const peerTypingTimerRef = useRef(null);
  const connections = useConnections();

  // WebRTC state
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' | 'video'
  const [incomingCall, setIncomingCall] = useState(null); // { from, offer, callType }
  const [callPeerId, setCallPeerId] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [callError, setCallError] = useState("");
  const [ringing, setRinging] = useState(false);
  const [iceState, setIceState] = useState('new');
  const [pcState, setPcState] = useState('new');
  // Devices and selection
  const [devices, setDevices] = useState({ mics: [], cams: [], speakers: [] });
  const [selectedMicId, setSelectedMicId] = useState('');
  const [selectedCamId, setSelectedCamId] = useState('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [presence, setPresence] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({}); // userId -> ISO string
  const pendingRemoteCandidatesRef = useRef([]);
  const [sawRelayLocal, setSawRelayLocal] = useState(false);
  const [sawRelayRemote, setSawRelayRemote] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({}); // cid -> percent
  const uploadCount = Object.keys(uploadProgress || {}).length;
  const [queuedFiles, setQueuedFiles] = useState([]); // {id, file, url, isImage, name, size, mime}
  // Reaction UI state
  const [activeReactionFor, setActiveReactionFor] = useState(null); // messageId
  const longPressTimerRef = useRef(null);
  // Per-message actions menu
  const [msgMenuOpenId, setMsgMenuOpenId] = useState(null);

  // Debounced inbox refresh
  const inboxRefreshTimerRef = useRef(null);
  const requestInboxRefresh = (delay = 300) => {
    try { if (inboxRefreshTimerRef.current) clearTimeout(inboxRefreshTimerRef.current); } catch {}
    inboxRefreshTimerRef.current = setTimeout(() => { try { fetchInbox(); } catch {} }, delay);
  };
  // per-user last seen fetch cooldown map (to avoid repeated failures)
  const lastSeenCooldownRef = useRef({});

  // Fallback name for People list when first/last name is missing
  const nameFromConn = (c) => {
    if (!c) return 'Unknown';
    const first = (c.firstName || '').trim();
    const last = (c.lastName || '').trim();
    const joined = `${first} ${last}`.trim();
    if (joined) return joined;
    if (c.userName && String(c.userName).trim()) return String(c.userName).trim();
    if (c.email && String(c.email).includes('@')) return String(c.email).split('@')[0];
    return 'Unknown';
  };

  // Surface call errors via global toast as well
  useEffect(() => {
    if (callError) {
      try { toast?.error(callError); } catch {}
    }
  }, [callError, toast]);

  const enqueueFiles = (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    setQueuedFiles((prev) => [
      ...prev,
      ...arr.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        url: URL.createObjectURL(f),
        isImage: (f.type || '').startsWith('image/'),
        name: f.name,
        size: f.size,
        mime: f.type,
      })),
    ]);
  };
  const removeQueued = (id) => {
    setQueuedFiles((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.url) { try { URL.revokeObjectURL(item.url); } catch {} }
      return prev.filter((x) => x.id !== id);
    });
  };
  const clearQueued = () => {
    setQueuedFiles((prev) => {
      prev.forEach((x) => { if (x.url) { try { URL.revokeObjectURL(x.url); } catch {} } });
      return [];
    });
  };
  const renegotiatingRef = useRef(false);
  const iceRescueTimerRef = useRef(null);
  const negoDebounceRef = useRef(null);
  const iceFailHangTimerRef = useRef(null);
  const remoteTrackWatchdogRef = useRef(null);
  const lastIceRestartAtRef = useRef(0);
  const callerPostAnswerTimerRef = useRef(null);

  // Socket listeners
  useEffect(() => {
    if (!userData?._id || !socket) return;

    // Optimistically bump thread to top in inbox
    const optimisticBump = (uid, lastMsgPartial = {}, unreadDelta = 0) => {
      const now = new Date().toISOString();
      const lm = { createdAt: now, ...lastMsgPartial };
      setInbox((prev) => {
        let found = false;
        const updated = (prev || []).map((r) => {
          if (r._id === uid) {
            found = true;
            const unread = Math.max(0, (r.unread || 0) + (unreadDelta || 0));
            return { ...r, unread, lastMessage: { ...(r.lastMessage || {}), ...lm } };
          }
          return r;
        });
        if (!found) {
          updated.push({ _id: uid, unread: Math.max(0, unreadDelta || 0), lastMessage: lm });
        }
        return updated;
      });
    };

  const onReceive = (data) => {
      // If message belongs to another thread than opened, still append to chat only when matching; always refresh inbox
      if (data?.senderId && receiverId && data.senderId !== receiverId) {
        // Optimistically bump that thread to top with +1 unread
    const now = new Date().toISOString();
    const previewText = data?.attachment?.name || (data?.attachment?.type === 'image' ? 'Image' : data.text);
    try { optimisticBump(data.senderId, { text: previewText, createdAt: now }, 1); } catch {}
  try { requestInboxRefresh(150); } catch {}
        return;
      }
      // Active thread: bump without unread increment
      if (data?.senderId) {
    const now = new Date().toISOString();
    const previewText = data?.attachment?.name || (data?.attachment?.type === 'image' ? 'Image' : data.text);
    try { optimisticBump(data.senderId, { text: previewText, createdAt: now }, 0); } catch {}
      }
      setChat((prev) => [
        ...prev,
        {
          from: data.senderId,
          to: userData._id,
          text: data.text || '',
          incoming: true,
          status: "delivered",
          createdAt: new Date().toISOString(),
          messageId: data.messageId,
          ...(data.attachment ? { attachment: data.attachment } : {})
        }
      ]);
      markReadIfVisible();
  try { requestInboxRefresh(150); } catch {}
    };
    const onStatus = ({ clientId, messageId, delivered }) => {
      if (!clientId) return;
      setChat((prev) => prev.map(m => m.clientId === clientId ? { ...m, messageId, status: delivered ? "delivered" : "sent" } : m));
    };
    const onTyping = ({ from, isTyping }) => {
      if (from === receiverId) {
        setPeerTyping(isTyping);
        if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
        if (isTyping) {
          peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), 2000);
        }
      }
  try { requestInboxRefresh(150); } catch {}
    };
    const onRead = ({ peerId }) => {
      if (peerId === receiverId) {
        setChat(prev => prev.map(m => (m.incoming ? m : { ...m, status: "read" })));
      }
    };

    const onIncomingCall = ({ from, offer, callType }) => {
      setIncomingCall({ from, offer, callType });
    };
    const onCallAnswer = async ({ from, answer }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setInCall(true);
          setRinging(false);
          // drain any queued candidates
          const queued = pendingRemoteCandidatesRef.current;
          pendingRemoteCandidatesRef.current = [];
          for (const c of queued) {
            try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
  // Immediately force an ICE restart on the caller for higher connectivity odds (throttled)
  try { await ensureSocketReady(); } catch {}
  try { await maybeIceRestart(); } catch {}
          // Watchdog: if no remote tracks show up, try renegotiation then ICE restart
          try { if (remoteTrackWatchdogRef.current) clearTimeout(remoteTrackWatchdogRef.current); } catch {}
          remoteTrackWatchdogRef.current = setTimeout(async () => {
            if (!remoteStreamRef.current) {
  try { await maybeIceRestart(); } catch {}
              setTimeout(async () => {
                if (!remoteStreamRef.current) {
                  try { await renegotiate('ice-restart'); } catch {}
                }
              }, 8000);
            }
          }, 7000);
        }
      } catch (e) { console.error(e); }
    };
    const onIceCandidate = async ({ from, candidate }) => {
      try {
        if (pcRef.current && candidate) {
          try {
            const candStr = candidate.candidate || '';
            if (candStr.toLowerCase().includes(' typ relay')) setSawRelayRemote(true);
          } catch {}
          // If remote description isn't set yet, queue the candidate
          if (!pcRef.current.remoteDescription || !pcRef.current.remoteDescription.type) {
            pendingRemoteCandidatesRef.current.push(candidate);
          } else {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (e) { console.error(e); }
    };
    const onCallEnded = () => {
      endCall(false);
    };
    const onCallRejected = () => {
      setIncomingCall(null);
      setInCall(false);
      setCallError("Call rejected");
      cleanupCall();
    };
    const onCallUnavailable = () => {
      setIncomingCall(null);
      setInCall(false);
      setCallError("User is unavailable");
      cleanupCall();
    };

    const onRenegotiateOffer = async ({ from, offer }) => {
      try {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket?.emit('renegotiate_answer', { to: from, from: userData._id, answer });
        const queued = pendingRemoteCandidatesRef.current;
        pendingRemoteCandidatesRef.current = [];
        for (const c of queued) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
      } catch (e) { console.warn('onRenegotiateOffer error', e?.message); }
    };
    const onRenegotiateAnswer = async ({ from, answer }) => {
      try {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        const queued = pendingRemoteCandidatesRef.current;
        pendingRemoteCandidatesRef.current = [];
        for (const c of queued) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
      } catch (e) { console.warn('onRenegotiateAnswer error', e?.message); }
    };

    socket.on("receive_message", onReceive);
    socket.on("message_status", onStatus);
    socket.on("typing", onTyping);
    socket.on("messages_read", onRead);

    socket.on("incoming_call", onIncomingCall);
    socket.on("call_answer", onCallAnswer);
    socket.on("ice_candidate", onIceCandidate);
    socket.on("call_ended", onCallEnded);
    socket.on("call_rejected", onCallRejected);
  socket.on("call_unavailable", onCallUnavailable);
  socket.on('renegotiate_offer', onRenegotiateOffer);
  socket.on('renegotiate_answer', onRenegotiateAnswer);

    // Chat message lifecycle events
    const onEdited = ({ messageId, text, editedAt }) => {
      setChat(prev => prev.map(m => (m.messageId === messageId ? { ...m, text, editedAt: editedAt || new Date().toISOString() } : m)));
    };
    const onDeleted = ({ messageId }) => {
      setChat(prev => prev.map(m => (m.messageId === messageId ? { ...m, deleted: true, text: '', attachment: undefined } : m)));
    };
    const onReaction = ({ messageId, reactions }) => {
      setChat(prev => prev.map(m => (m.messageId === messageId ? { ...m, reactions: Array.isArray(reactions) ? reactions : [] } : m)));
    };
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('message_reaction', onReaction);
  // Presence
  const onUserOnline = ({ userId }) => setPresence(p => ({ ...p, [userId]: true }));
  const onUserOffline = ({ userId }) => setPresence(p => ({ ...p, [userId]: false }));
  socket.on('user_online', onUserOnline);
  socket.on('user_offline', onUserOffline);
  socket.on('presence_snapshot', ({ users }) => {
    if (!Array.isArray(users)) return;
    const map = {};
    users.forEach((uid) => { map[uid] = true; });
    setPresence(map);
  });
  // When a user goes offline, fetch their lastSeen once
  const fetchLastSeen = async (uid) => {
    if (!uid || !serverUrl) return;
    const now = Date.now();
    const nextOk = lastSeenCooldownRef.current[uid] || 0;
    if (now < nextOk) return; // still cooling down
    try {
      const res = await axios.get(`${serverUrl}/api/user/${uid}/last-seen`, { withCredentials: true });
      const ts = res.data?.lastSeen || null;
      setLastSeenMap((m) => ({ ...m, [uid]: ts }));
      // regular refresh allowed again in 3 minutes
      lastSeenCooldownRef.current[uid] = now + 180000;
    } catch (e) {
      const status = e?.response?.status;
      // If unauthorized/forbidden, back off for a longer period
      lastSeenCooldownRef.current[uid] = now + (status === 401 || status === 403 ? 600000 : 180000);
    }
  };

  socket.on('user_offline', async ({ userId }) => { fetchLastSeen(userId); });

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("message_status", onStatus);
      socket.off("typing", onTyping);
  socket.off("messages_read", onRead);
  try { if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current); } catch {}

      socket.off("incoming_call", onIncomingCall);
      socket.off("call_answer", onCallAnswer);
      socket.off("ice_candidate", onIceCandidate);
      socket.off("call_ended", onCallEnded);
      socket.off("call_rejected", onCallRejected);
  socket.off("call_unavailable", onCallUnavailable);
  socket.off('renegotiate_offer', onRenegotiateOffer);
  socket.off('renegotiate_answer', onRenegotiateAnswer);
  socket.off('user_online', onUserOnline);
  socket.off('user_offline', onUserOffline);
      socket.off('user_offline');
  socket.off('presence_snapshot');
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('message_reaction', onReaction);
    };
  }, [socket, userData?._id, receiverId]);

  // Inbox fetcher
  const fetchInbox = async () => {
    if (!userData?._id || !serverUrl) return;
    try {
      setInboxLoading(true);
      const res = await axios.get(`${serverUrl}/api/chat/inbox`, { withCredentials: true });
  const rows = Array.isArray(res.data) ? res.data : [];
  setInbox(rows);
  const total = rows.reduce((sum, r) => sum + (r.unread || 0), 0);
  try { setChatUnreadCount(total); } catch {}
    } catch {}
    finally { setInboxLoading(false); }
  };
  useEffect(() => { fetchInbox(); }, [userData?._id, serverUrl]);

  // Fetch chat history whenever receiver changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userData?._id || !receiverId || !serverUrl) return;
      // If peer is offline, fetch last seen
      try {
        if (!presence[receiverId]) {
          const res = await axios.get(`${serverUrl}/api/user/${receiverId}/last-seen`, { withCredentials: true });
          const ts = res.data?.lastSeen || null;
          setLastSeenMap((m) => ({ ...m, [receiverId]: ts }));
        }
      } catch {}
      try {
  const res = await axios.get(`${serverUrl}/api/chat/history/${receiverId}?page=1&limit=30`, { withCredentials: true });
  const rawItems = res.data.items || [];
  setHistoryCursor(res.data?.nextCursor || null);
  const items = rawItems.map(msg => {
          if (msg.type === 'call') {
            const incoming = msg.from !== userData._id;
            const labelBase = msg.callType === 'video' ? 'Video call' : 'Voice call';
            let detail = msg.status;
            if (msg.status === 'answered' && msg.startedAt && msg.endedAt) {
              const sec = Math.max(0, Math.floor((new Date(msg.endedAt) - new Date(msg.startedAt)) / 1000));
              const mm = String(Math.floor(sec / 60)).padStart(2, '0');
              const ss = String(sec % 60).padStart(2, '0');
              detail = `duration ${mm}:${ss}`;
            } else if (msg.status === 'rejected' || msg.status === 'missed' || msg.status === 'unavailable') {
              detail = msg.status;
            }
            return {
              _id: msg._id,
              type: 'call',
              incoming,
              text: `${labelBase} · ${incoming ? 'from' : 'to'} ${incoming ? 'them' : 'them'} · ${detail}`,
              status: undefined,
              createdAt: msg.createdAt || msg.startedAt || new Date().toISOString()
            };
          }
          // Build attachment object if present
          const attachment = msg.attachmentUrl ? {
            url: msg.attachmentUrl,
            type: msg.attachmentType,
            name: msg.attachmentName,
            mime: msg.attachmentMime,
            size: msg.attachmentSize,
            width: msg.attachmentWidth,
            height: msg.attachmentHeight,
          } : undefined;
          const text = (msg.text && msg.text.trim() !== '')
            ? msg.text
            : (attachment ? (attachment.type === 'image' ? 'Image' : (attachment.name || 'Attachment')) : '');
          return {
            ...msg,
            text,
            attachment,
            incoming: msg.from !== userData._id,
            clientId: undefined,
            messageId: msg._id,
            status: msg.readAt ? 'read' : (msg.deliveredAt ? 'delivered' : (msg.from === userData._id ? 'sent' : undefined))
          };
        });
  setChat(items);
  markRead();
  scrollToBottomSoon();
      } catch (err) {
        setChat([]);
      }
    };
    fetchHistory();
  }, [receiverId, userData?._id, serverUrl]);

  const markRead = () => {
    if (!userData?._id || !receiverId) return;
    socket?.emit("mark_read", { from: receiverId, to: userData._id });
  // Optimistically zero unread for this thread in inbox
  setInbox(prev => (prev || []).map(r => r._id === receiverId ? { ...r, unread: 0 } : r));
  try { requestInboxRefresh(150); } catch {}
  };

  const markReadIfVisible = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) markRead();
    setShowScrollDown(!nearBottom);
  };

  // Infinite scroll: load older when near top
  const loadOlder = async () => {
    if (!receiverId || !serverUrl || loadingOlder) return;
    if (!historyCursor) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      params.set('before', historyCursor);
      const res = await axios.get(`${serverUrl}/api/chat/history/${receiverId}?${params.toString()}`, { withCredentials: true });
      const raw = res.data?.items || [];
      const older = raw.map(msg => {
        if (msg.type === 'call') {
          const incoming = msg.from !== userData._id;
          const labelBase = msg.callType === 'video' ? 'Video call' : 'Voice call';
          let detail = msg.status;
          if (msg.status === 'answered' && msg.startedAt && msg.endedAt) {
            const sec = Math.max(0, Math.floor((new Date(msg.endedAt) - new Date(msg.startedAt)) / 1000));
            const mm = String(Math.floor(sec / 60)).padStart(2, '0');
            const ss = String(sec % 60).padStart(2, '0');
            detail = `duration ${mm}:${ss}`;
          } else if (msg.status === 'rejected' || msg.status === 'missed' || msg.status === 'unavailable') {
            detail = msg.status;
          }
          return {
            _id: msg._id,
            type: 'call',
            incoming,
            text: `${labelBase} · ${incoming ? 'from' : 'to'} them · ${detail}`,
            status: undefined,
            createdAt: msg.createdAt || msg.startedAt || new Date().toISOString()
          };
        }
        const attachment = msg.attachmentUrl ? {
          url: msg.attachmentUrl,
          type: msg.attachmentType,
          name: msg.attachmentName,
          mime: msg.attachmentMime,
          size: msg.attachmentSize,
          width: msg.attachmentWidth,
          height: msg.attachmentHeight,
        } : undefined;
        const text = (msg.text && msg.text.trim() !== '') ? msg.text : (attachment ? (attachment.type === 'image' ? 'Image' : (attachment.name || 'Attachment')) : '');
        return {
          ...msg,
          text,
          attachment,
          incoming: msg.from !== userData._id,
          clientId: undefined,
          messageId: msg._id,
          status: msg.readAt ? 'read' : (msg.deliveredAt ? 'delivered' : (msg.from === userData._id ? 'sent' : undefined))
        };
      });
      setChat(prev => [...older, ...prev]);
      setHistoryCursor(res.data?.nextCursor || null);
      // Maintain scroll position after prepending
      setTimeout(() => {
        if (!el) return;
        const newHeight = el.scrollHeight;
        const delta = newHeight - prevHeight;
        el.scrollTop = (el.scrollTop || 0) + delta;
      }, 0);
    } catch {}
    finally { setLoadingOlder(false); }
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScrollTop = () => {
      if (el.scrollTop < 40) loadOlder();
    };
    el.addEventListener('scroll', onScrollTop);
    return () => el.removeEventListener('scroll', onScrollTop);
  }, [receiverId, historyCursor, loadingOlder]);

  // UI helpers
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollToBottom = () => {
    // Prefer a bottom sentinel so images or late layout shifts are handled reliably
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      try { bottomRef.current.scrollIntoView({ block: 'end' }); return; } catch {}
    }
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };
  const scrollToBottomSoon = () => {
    // Try across a few frames to catch images/fonts/layout settling
    try { requestAnimationFrame(scrollToBottom); } catch { scrollToBottom(); }
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 300);
  };
  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    const d1 = new Date(a), d2 = new Date(b);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };
  const niceDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const today = new Date();
    const yday = new Date(Date.now() - 86400000);
    if (isSameDay(dt, today)) return 'Today';
    if (isSameDay(dt, yday)) return 'Yesterday';
    return dt.toLocaleDateString();
  };
  const niceTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const niceLastSeen = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const today = new Date();
    const yday = new Date(Date.now() - 86400000);
    if (isSameDay(dt, today)) return `last seen today at ${niceTime(dt)}`;
    if (isSameDay(dt, yday)) return `last seen yesterday at ${niceTime(dt)}`;
    return `last seen ${dt.toLocaleDateString()} at ${niceTime(dt)}`;
  };
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const getConnById = (id) => connections.find(c => c._id === id);
  const nameForId = (id) => {
    const c = getConnById(id);
    return c ? `${c.firstName} ${c.lastName}` : id;
  };
  const imgForId = (id) => {
    const raw = getConnById(id)?.profileImage;
    return (raw ? bust(raw) : null) || dp;
  };
  // Pinned conversations (client-side, persisted)
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chat_pins') || '[]'); } catch { return []; }
  });
  const isPinned = (id) => Array.isArray(pinned) && pinned.includes(id);
  const togglePin = (id) => {
    setPinned((prev) => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      const arr = Array.from(set);
      try { localStorage.setItem('chat_pins', JSON.stringify(arr)); } catch {}
      return arr;
    });
  };
  // Archived conversations (client-side, persisted)
  const [archived, setArchived] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chat_archived') || '[]'); } catch { return []; }
  });
  const isArchived = (id) => Array.isArray(archived) && archived.includes(id);
  const toggleArchive = (id) => {
    setArchived((prev) => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      const arr = Array.from(set);
      try { localStorage.setItem('chat_archived', JSON.stringify(arr)); } catch {}
      return arr;
    });
  };
  // Muted conversations (client-side, persisted)
  const [mutes, setMutes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chat_mutes') || '[]'); } catch { return []; }
  });
  const isMutedThread = (id) => Array.isArray(mutes) && mutes.includes(id);
  const toggleMuteThread = (id) => {
    setMutes((prev) => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      const arr = Array.from(set);
      try { localStorage.setItem('chat_mutes', JSON.stringify(arr)); } catch {}
      return arr;
    });
  };
  const markReadThread = (uid) => {
    if (!socket || !userData?._id || !uid) return;
    try { socket.emit('mark_read', { from: uid, to: userData._id }); } catch {}
    if (receiverId === uid) setChat(prev => prev.map(m => m.incoming ? { ...m, status: 'read' } : m));
  try { requestInboxRefresh(150); } catch {}
  };
  // Close overflow menu on outside click
  useEffect(() => {
    const onDocClick = () => {
      setMenuOpenId(null);
      setActiveReactionFor(null);
      setMsgMenuOpenId(null);
    };
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('click', onDocClick);
      try { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); } catch {}
      try { if (inboxRefreshTimerRef.current) clearTimeout(inboxRefreshTimerRef.current); } catch {}
    };
  }, []);
  // Auto-collapse People when many unread
  const unreadTotal = inbox.reduce((sum, r) => sum + (r.unread || 0), 0);
  // Persisted visibility for People section; default to true
  const [showPeople, setShowPeople] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_show_people');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });
  useEffect(() => {
    try { localStorage.setItem('chat_show_people', String(showPeople)); } catch {}
  }, [showPeople]);
  // Sort strictly by last activity time so the latest chat is always on top
  const sortedInbox = [...inbox].sort((a, b) => {
    const at = new Date(a.lastMessage?.createdAt || a.createdAt || 0).getTime();
    const bt = new Date(b.lastMessage?.createdAt || b.createdAt || 0).getTime();
    return bt - at;
  });
  const filteredInbox = sortedInbox.filter((row) => {
    if (!sidebarQuery.trim()) return true;
    const q = sidebarQuery.toLowerCase();
    const name = nameForId(row._id).toLowerCase();
    const preview = (row.lastMessage?.text || '').toLowerCase();
    return name.includes(q) || preview.includes(q);
  });
  const nonArchivedInbox = filteredInbox.filter(r => !isArchived(r._id));
  const pinnedInbox = nonArchivedInbox.filter((r) => isPinned(r._id));
  const unpinnedInbox = nonArchivedInbox.filter((r) => !isPinned(r._id));
  const archivedInbox = filteredInbox.filter((r) => isArchived(r._id));

  const markAllRead = () => {
    if (!socket || !userData?._id) return;
    const unreadRows = inbox.filter(r => (r.unread || 0) > 0);
    unreadRows.forEach(r => {
      try { socket.emit('mark_read', { from: r._id, to: userData._id }); } catch {}
    });
    // Optimistically clear local statuses for current thread
    setChat(prev => prev.map(m => m.incoming ? { ...m, status: 'read' } : m));
    try { fetchInbox(); } catch {}
  };
  const sendMessage = async () => {
    if (!receiverId || !userData?._id) return;
    const textToSend = message.trim();
    const hasQueued = queuedFiles.length > 0;
    if (!textToSend && !hasQueued) return;

    // 1) Send queued attachments first
    if (hasQueued) {
      for (const q of queuedFiles) {
        await sendAttachment(q.file);
      }
      clearQueued();
    }

    // 2) Then send text if present
    if (textToSend) {
      const cid = Date.now().toString();
      setChat((prev) => [
        ...prev,
        { senderId: userData._id, text: textToSend, incoming: false, clientId: cid, status: "sent", createdAt: new Date().toISOString() },
      ]);
      try {
        const now = new Date().toISOString();
        setInbox(prev => {
          let found = false;
          const updated = (prev || []).map(r => r._id === receiverId ? (found = true, { ...r, lastMessage: { ...(r.lastMessage || {}), text: textToSend, createdAt: now } }) : r);
          if (!found) updated.push({ _id: receiverId, unread: 0, lastMessage: { text: textToSend, createdAt: now } });
          return updated;
        });
      } catch {}
      socket?.emit("send_message", {
        senderId: userData._id,
        receiverId,
        text: textToSend,
        clientId: cid,
      });
      setMessage("");
      socket?.emit("typing", { from: userData._id, to: receiverId, isTyping: false });
      try { fetchInbox(); } catch {}
      scrollToBottomSoon();
    }
  };

  // Edit/Delete window (10 minutes)
  const EDIT_WINDOW_MS = 10 * 60 * 1000;
  const canModify = (m) => {
    if (!m || m.deleted) return false;
    if (m.incoming) return false;
    const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0;
    return ts > 0 && (Date.now() - ts) <= EDIT_WINDOW_MS;
  };

  // Message edit/delete/react helpers
  const beginEdit = (m) => { if (!m?.messageId) return; setEditingId(m.messageId); setEditValue(m.text || ""); };
  const cancelEdit = () => { setEditingId(null); setEditValue(""); };
  const saveEdit = async (m) => {
    const text = (editValue || '').trim();
    if (!m?.messageId) return cancelEdit();
    if (!text) return cancelEdit();
    try {
      await editMessageHttp(m.messageId, text);
      setChat(prev => prev.map(x => (x.messageId === m.messageId ? { ...x, text, editedAt: new Date().toISOString() } : x)));
      socket?.emit('message_edited', { messageId: m.messageId, to: receiverId, text });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to edit message';
      try { toast?.error(msg); } catch {}
    }
    finally { cancelEdit(); }
  };
  const deleteMsg = async (m) => {
    if (!m?.messageId) return;
    try {
      await deleteMessageHttp(m.messageId);
      setChat(prev => prev.map(x => (x.messageId === m.messageId ? { ...x, deleted: true, text: '', attachment: undefined } : x)));
      socket?.emit('message_deleted', { messageId: m.messageId, to: receiverId });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to delete message';
      try { toast?.error(msg); } catch {}
    }
  };
  const REACTION_FALLBACK_EMOJI = { like: '👍', love: '❤️', wow: '😮', sad: '😢', angry: '😡' };
  const EMOJI_TO_KEY = { '👍':'like', '❤️':'love', '😮':'wow', '😂':'wow', '🙏':'love', '😢':'sad', '😡':'angry' };
  const quickReact = async (m, reactionKey) => {
    if (!m?.messageId) return;
    const didReact = myReacted(m, reactionKey);
    const prevReactions = Array.isArray(m.reactions) ? m.reactions : [];
    const optimistic = didReact
      ? prevReactions.filter(r => {
          const norm = EMOJI_TO_KEY[r.emoji] || r.emoji;
          return !(String(r.user) === String(userData._id) && norm === reactionKey);
        })
      : [...prevReactions, { user: userData._id, emoji: reactionKey, createdAt: new Date().toISOString() }];
    setChat(prev => prev.map(x => (x.messageId === m.messageId ? { ...x, reactions: optimistic } : x)));
    try {
      const res = await reactMessageHttp(m.messageId, reactionKey);
      const list = res.data?.reactions || [];
      setChat(prev => prev.map(x => (x.messageId === m.messageId ? { ...x, reactions: list } : x)));
      socket?.emit('message_reaction', { messageId: m.messageId, to: receiverId, reactions: list });
    } catch (e) {
      setChat(prev => prev.map(x => (x.messageId === m.messageId ? { ...x, reactions: prevReactions } : x)));
    }
  };
  const myReacted = (m, key) => Array.isArray(m?.reactions) && m.reactions.some(r => {
    const norm = EMOJI_TO_KEY[r.emoji] || r.emoji;
    return norm === key && String(r.user) === String(userData._id);
  });
  const countReact = (m, key) => (Array.isArray(m?.reactions)
    ? m.reactions.filter(r => {
        const norm = EMOJI_TO_KEY[r.emoji] || r.emoji;
        return norm === key;
      }).length
    : 0);

  const onPickFile = () => { try { fileInputRef.current?.click?.(); } catch {} };
  const sendAttachment = async (file) => {
    if (!receiverId || !file || !userData?._id || !serverUrl) return;
    const cid = `att-${Date.now()}`;
    const isImage = (file.type || '').startsWith('image/');
    // Local optimistic bubble using object URL
    const objUrl = URL.createObjectURL(file);
    setChat(prev => ([...prev, {
      senderId: userData._id,
      text: '',
      incoming: false,
      clientId: cid,
      status: 'sent',
      createdAt: new Date().toISOString(),
      attachment: { url: objUrl, type: isImage ? 'image' : 'file', name: file.name, mime: file.type, size: file.size }
    }]));
  setUploadProgress((m) => ({ ...m, [cid]: 0 }));
  scrollToBottomSoon();
    // Bump inbox preview
    try {
      setInbox(prev => {
        const now = new Date().toISOString();
        let found = false;
        const preview = isImage ? 'Image' : file.name;
        const updated = (prev || []).map(r => r._id === receiverId ? (found = true, { ...r, lastMessage: { ...(r.lastMessage || {}), text: preview, createdAt: now } }) : r);
        if (!found) updated.push({ _id: receiverId, unread: 0, lastMessage: { text: preview, createdAt: now } });
        return updated;
      });
    } catch {}
  try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${serverUrl}/api/upload/attachment`, fd, {
        withCredentials: true,
        onUploadProgress: (e) => {
          if (!e.total) return;
          const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
          setUploadProgress((m) => ({ ...m, [cid]: pct }));
        }
      });
      const { url } = res.data || {};
      let width = 0, height = 0;
      if (isImage) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { width = img.naturalWidth; height = img.naturalHeight; resolve(); };
          img.onerror = () => resolve();
          img.src = url;
        });
      }
  socket?.emit('send_message', {
        senderId: userData._id,
        receiverId,
        text: '',
        clientId: cid,
        attachment: { url, type: isImage ? 'image' : 'file', name: file.name, mime: file.type, size: file.size, width, height },
      });
  try { fetchInbox(); } catch {}
      // clear progress after upload completes
      setUploadProgress((m) => { const n = { ...m }; delete n[cid]; return n; });
    } catch (e) {
      console.error('sendAttachment error', e);
      setUploadProgress((m) => { const n = { ...m }; delete n[cid]; return n; });
    }
  };

  // When opening a chat, ensure we land at the latest message
  useEffect(() => {
    if (!receiverId) return;
    scrollToBottomSoon();
  }, [receiverId]);

  // Drag & drop for attachments
  const onDragOver = (e) => {
    try { e.preventDefault(); e.stopPropagation(); } catch {}
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    try { e.preventDefault(); e.stopPropagation(); } catch {}
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) enqueueFiles(files);
  };

  // typing events
  useEffect(() => {
    if (!userData?._id || !receiverId) return;
    if (message && !isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { from: userData._id, to: receiverId, isTyping: true });
    }
    const t = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket?.emit("typing", { from: userData._id, to: receiverId, isTyping: false });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [message, userData?._id, receiverId, isTyping, socket]);

  // Helper: create peer connection
  const createPeerConnection = (targetId) => {
    const iceServers = [
      { urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302"
      ]}
    ];
    // Prefer dynamic ICE servers fetched from backend if available
    const dyn = window.__ICE_SERVERS__;
    const tcpOnly = (import.meta.env.VITE_TURN_TCP_ONLY || '').toString().toLowerCase() === 'true';
    if (Array.isArray(dyn) && dyn.length) {
      const filtered = tcpOnly
        ? dyn.filter((s) => {
            const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
            return urls.some((u) => {
              const v = (u || '').toString().toLowerCase();
              return v.startsWith('turns:') || v.includes('transport=tcp');
            });
          })
        : dyn;
      filtered.forEach((s) => iceServers.push(s));
    } else {
      // Optional TURN from env (comma-separated URLs)
      const turnUrls = import.meta.env.VITE_TURN_URL;
      const turnUser = import.meta.env.VITE_TURN_USERNAME;
      const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
      if (turnUrls && turnUser && turnCred) {
        const all = turnUrls.split(",").map((s) => s.trim()).filter(Boolean);
        const urls = tcpOnly
          ? all.filter((u) => {
              const v = (u || '').toString().toLowerCase();
              return v.startsWith('turns:') || v.includes('transport=tcp');
            })
          : all;
        if (urls.length) {
          iceServers.push({ urls, username: turnUser, credential: turnCred });
        }
      }
    }
    const forceRelay = (import.meta.env.VITE_FORCE_TURN || '').toString().toLowerCase() === 'true';
    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: forceRelay ? 'relay' : 'all',
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 2,
    });
    // Surface ICE state changes for debugging
    pc.oniceconnectionstatechange = () => {
      try {
        setIceState(pc.iceConnectionState || '');
        console.debug('ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          try { if (iceRescueTimerRef.current) clearTimeout(iceRescueTimerRef.current); } catch {}
          try { if (iceFailHangTimerRef.current) clearTimeout(iceFailHangTimerRef.current); } catch {}
        }
        if ((pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') && !renegotiatingRef.current) {
          // Try to rescue the session using ICE restart
          maybeIceRestart().catch(() => {});
          // If not recovered soon, auto end to stop timers/UI
          scheduleIceFailHang();
        }
      } catch {}
    };
    pc.onicegatheringstatechange = () => {
      try { console.debug('ICE gathering:', pc.iceGatheringState); } catch {}
    };
    pc.onicecandidateerror = (e) => {
      try { console.warn('ICE candidate error:', e?.errorText || e); } catch {}
    };
    pc.onconnectionstatechange = () => {
      try {
        setPcState(pc.connectionState || '');
        console.debug('PC state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          try { if (iceRescueTimerRef.current) clearTimeout(iceRescueTimerRef.current); } catch {}
          try { if (iceFailHangTimerRef.current) clearTimeout(iceFailHangTimerRef.current); } catch {}
        }
        if ((pc.connectionState === 'disconnected' || pc.connectionState === 'failed') && !renegotiatingRef.current) {
          scheduleIceFailHang();
        }
      } catch {}
    };
    // Ensure we renegotiate when remote or local tracks change (helps when callee adds video after answering)
    // Auto renegotiate when tracks added after initial answer/offer (debounced)
    pc.onnegotiationneeded = () => {
      try {
        if (negoDebounceRef.current) clearTimeout(negoDebounceRef.current);
        negoDebounceRef.current = setTimeout(() => {
          if (!renegotiatingRef.current) {
            renegotiate('normal').catch(() => {});
          }
        }, 150);
      } catch {}
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && targetId) {
        try {
          const candStr = e.candidate.candidate || '';
          if (candStr.toLowerCase().includes(' typ relay')) setSawRelayLocal(true);
        } catch {}
        socket?.emit("ice_candidate", { to: targetId, from: userData._id, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      try { if (remoteTrackWatchdogRef.current) clearTimeout(remoteTrackWatchdogRef.current); } catch {}
      // Build stream fallback when e.streams is empty
      let stream = e.streams && e.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        try { remoteStreamRef.current.addTrack(e.track); } catch {}
        stream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = stream;
      }
      try { console.debug('Remote track received:', (stream?.getTracks?.() || []).map(t=>t.kind).join(',')); } catch {}
      if (remoteVideoRef.current) {
        try {
          remoteVideoRef.current.srcObject = stream;
          const p = remoteVideoRef.current.play?.();
          if (p && typeof p.then === 'function') p.catch(() => {});
        } catch {}
      }
      if (remoteAudioRef.current) {
        try {
          remoteAudioRef.current.srcObject = stream;
          const p = remoteAudioRef.current.play?.();
          if (p && typeof p.then === 'function') p.catch(() => {});
        } catch {}
      }
    };
    return pc;
  };

  const scheduleIceRescue = () => {
    try { if (iceRescueTimerRef.current) clearTimeout(iceRescueTimerRef.current); } catch {}
    iceRescueTimerRef.current = setTimeout(() => {
      // If still not connected after grace period, force an ICE restart
      if (pcRef.current && ['new','checking'].includes(pcRef.current.iceConnectionState)) {
        console.warn('ICE stuck in', pcRef.current.iceConnectionState, '— triggering ICE restart');
        maybeIceRestart().catch(() => {});
      }
    }, 12000); // 12s grace
  };

  const scheduleIceFailHang = () => {
    try { if (iceFailHangTimerRef.current) clearTimeout(iceFailHangTimerRef.current); } catch {}
    iceFailHangTimerRef.current = setTimeout(() => {
      const pc = pcRef.current;
      if (!pc) return;
      const badIce = ['disconnected', 'failed'].includes(pc.iceConnectionState);
      const badPc = ['disconnected', 'failed'].includes(pc.connectionState);
      if (badIce || badPc) {
        console.warn('Auto hanging call due to prolonged ICE/PC failure:', pc.iceConnectionState, pc.connectionState);
        endCall(true);
      }
    }, 22000);
  };

  const ensureSocketReady = async () => {
    if (!socket) throw new Error("Socket not available");
    if (socket.connected) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (!socket.connected) throw new Error("Socket not connected");
  };

  // Renegotiation helper (optionally with ICE restart)
  const renegotiate = async (mode = 'normal') => {
    if (!pcRef.current || !callPeerId) return;
    try {
      renegotiatingRef.current = true;
      const offer = await pcRef.current.createOffer({ iceRestart: mode === 'ice-restart' });
      await pcRef.current.setLocalDescription(offer);
      socket?.emit('renegotiate_offer', { to: callPeerId, from: userData._id, offer });
    } catch (e) {
      console.warn('renegotiate error', e?.message);
    } finally {
      setTimeout(() => { renegotiatingRef.current = false; }, 1500);
    }
  };

  // Throttled ICE restart to avoid both sides flooding restarts
  const maybeIceRestart = async (minGapMs = 3000) => {
    const now = Date.now();
    if (now - lastIceRestartAtRef.current < minGapMs) return;
    lastIceRestartAtRef.current = now;
    try { await renegotiate('ice-restart'); } catch {}
  };

  // If the remote stream arrived before the CallWindow mounted (common for callee), attach it now
  useEffect(() => {
    if (!inCall) return;
    const rstream = remoteStreamRef.current;
    if (!rstream) return;
    try {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = rstream;
        const p = remoteVideoRef.current.play?.();
        if (p && typeof p.then === 'function') p.catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = rstream;
        const p = remoteAudioRef.current.play?.();
        if (p && typeof p.then === 'function') p.catch(() => {});
      }
    } catch {}
  }, [inCall]);

  // Ensure local preview attaches when the UI mounts (e.g., during ringing before inCall)
  useEffect(() => {
    const lstream = localStreamRef.current;
    if (!lstream) return;
    try {
      if (localVideoRef.current && localVideoRef.current.srcObject !== lstream) {
        localVideoRef.current.srcObject = lstream;
        const p = localVideoRef.current.play?.();
        if (p && typeof p.then === 'function') p.catch(() => {});
      }
    } catch {}
  }, [ringing, inCall]);

  // Fetch dynamic ICE servers from backend once per app session
  const ensureIceServers = async (force = false) => {
    // Refresh if forced or if missing or if older than 30 minutes
    const now = Date.now();
    const staleAfterMs = 30 * 60 * 1000;
    const have = Array.isArray(window.__ICE_SERVERS__) && window.__ICE_SERVERS__.length;
    const age = now - (window.__ICE_FETCHED_AT__ || 0);
    if (!force && have && age < staleAfterMs) return;
    if (!serverUrl) return; // fallback to STUN/env TURN in createPeerConnection
    try {
      const res = await fetch(`${serverUrl}/api/rtc/ice`);
      if (res.ok) {
        const { iceServers } = await res.json();
        if (Array.isArray(iceServers) && iceServers.length) {
          window.__ICE_SERVERS__ = iceServers;
          window.__ICE_FETCHED_AT__ = Date.now();
        }
      } else {
        try { console.warn('ICE fetch failed:', res.status, await res.text()); } catch {}
      }
    } catch {}
  };

  // Enumerate media devices (labels available after permission granted)
  const enumerateDevices = async () => {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) return;
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics = list.filter((d) => d.kind === 'audioinput');
      const cams = list.filter((d) => d.kind === 'videoinput');
      const speakers = list.filter((d) => d.kind === 'audiooutput');
      setDevices({ mics, cams, speakers });
      // Set defaults if not set
      if (!selectedMicId && mics[0]) setSelectedMicId(mics[0].deviceId || 'default');
      if (!selectedCamId && cams[0]) setSelectedCamId(cams[0].deviceId || 'default');
      if (!selectedSpeakerId && speakers[0]) setSelectedSpeakerId(speakers[0].deviceId || 'default');
    } catch {}
  };

  // React to device changes (plug/unplug)
  useEffect(() => {
    const onChange = () => { enumerateDevices(); };
    try { navigator?.mediaDevices?.addEventListener?.('devicechange', onChange); } catch {}
    return () => { try { navigator?.mediaDevices?.removeEventListener?.('devicechange', onChange); } catch {} };
  }, []);

  // Try initial enumeration (labels appear after first permission grant)
  useEffect(() => { enumerateDevices(); }, []);

  // Expose a tiny ICE debug hook in dev for quick checks
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__dumpIce = () => ({
        dyn: window.__ICE_SERVERS__,
        forceTurn: (import.meta.env.VITE_FORCE_TURN || '').toString(),
      });
    }
  }, []);

  // Preload dynamic ICE servers on mount (helps callee be ready immediately)
  useEffect(() => {
    ensureIceServers();
  }, []);

  // Request presence snapshot when ChatWindow mounts and socket is available
  useEffect(() => {
    if (!socket) return;
    try { socket.emit('presence_request'); } catch {}
  }, [socket]);

  const getMedia = async (type) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Media devices not supported in this browser");
    }
    const tcpOnly = (import.meta.env.VITE_TURN_TCP_ONLY || '').toString().toLowerCase() === 'true';
    // Prefer lower-bitrate constraints for TCP-only TURN networks
    const constraintsVideo = tcpOnly ? {
      video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 24 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    } : {
      video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    };
    const constraintsAudio = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
    try {
      const constraints = type === 'video' ? constraintsVideo : constraintsAudio;
      // Apply preferred devices if selected
      const withIds = { ...constraints };
      try {
        if (withIds.audio && selectedMicId) {
          withIds.audio = { ...(typeof withIds.audio === 'object' ? withIds.audio : {}), deviceId: selectedMicId === 'default' ? undefined : { exact: selectedMicId } };
        }
        if (withIds.video && selectedCamId) {
          withIds.video = { ...(typeof withIds.video === 'object' ? withIds.video : {}), deviceId: selectedCamId === 'default' ? undefined : { exact: selectedCamId } };
        }
      } catch {}
      const stream = await navigator.mediaDevices.getUserMedia(withIds);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = stream;
          const p = localVideoRef.current.play?.();
          if (p && typeof p.then === 'function') p.catch(() => {});
        } catch {}
      }
      // populate devices list after permission granted
      try { enumerateDevices(); } catch {}
      return stream;
    } catch (e) {
  if (type === 'video') {
        // Fallback to audio-only if video fails (permissions or no camera)
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraintsAudio);
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            try { localVideoRef.current.srcObject = stream; } catch {}
          }
          try { enumerateDevices(); } catch {}
          return stream;
        } catch (err) {
          throw e;
        }
      }
      throw e;
    }
  };

  // Switch active microphone during a call
  const switchMic = async (deviceId) => {
    try {
      if (!pcRef.current) return;
      const audio = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId === 'default' ? undefined : { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const newTrack = audio.getAudioTracks()[0];
      if (!newTrack) return;
      const sender = pcRef.current.getSenders?.().find((s) => s.track && s.track.kind === 'audio');
      if (sender) {
        await sender.replaceTrack(newTrack).catch(() => {});
        // Update local stream: stop old audio tracks, add new
        try { localStreamRef.current?.getAudioTracks?.().forEach((t) => t.stop()); } catch {}
        try { localStreamRef.current?.removeTrack?.(localStreamRef.current.getAudioTracks?.()[0]); } catch {}
        try { localStreamRef.current?.addTrack?.(newTrack); } catch {}
        setSelectedMicId(deviceId);
      }
    } catch {}
  };

  // Switch active camera during a call
  const switchCamera = async (deviceId) => {
    try {
      if (!pcRef.current) return;
      const video = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId === 'default' ? undefined : { exact: deviceId } } });
      const newTrack = video.getVideoTracks()[0];
      if (!newTrack) return;
      const sender = pcRef.current.getSenders?.().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack).catch(() => {});
        // Update local stream and preview
        try { localStreamRef.current?.getVideoTracks?.().forEach((t) => t.stop()); } catch {}
        try { localStreamRef.current?.removeTrack?.(localStreamRef.current.getVideoTracks?.()[0]); } catch {}
        try { localStreamRef.current?.addTrack?.(newTrack); } catch {}
        if (localVideoRef.current) {
          try { localVideoRef.current.srcObject = localStreamRef.current; } catch {}
        }
        setSelectedCamId(deviceId);
        setCameraOff(false);
      }
    } catch {}
  };

  // Switch audio output sink (if supported by browser)
  const switchSpeaker = async (deviceId) => {
    try {
      if (!remoteAudioRef.current) return;
      if (typeof remoteAudioRef.current.setSinkId === 'function') {
        await remoteAudioRef.current.setSinkId(deviceId);
        setSelectedSpeakerId(deviceId);
      }
    } catch {}
  };

  // Flip camera between front/back where possible
  const flipCamera = async () => {
    try {
      const cams = devices.cams || [];
      if (!cams.length) return;
      // Find current index; pick next
      const idx = Math.max(0, cams.findIndex((c) => c.deviceId === selectedCamId));
      const next = cams[(idx + 1) % cams.length];
      if (next) await switchCamera(next.deviceId || 'default');
    } catch {}
  };

  const startCall = async (type) => {
    if (!receiverId || !userData?._id) return;
    try {
      setCallError("");
      await ensureSocketReady();
  // Ensure dynamic ICE (TURN) is available before creating PC (refresh per call)
  await ensureIceServers(true);
      const forceRelay = (import.meta.env.VITE_FORCE_TURN || '').toString().toLowerCase() === 'true';
      const tcpOnly = (import.meta.env.VITE_TURN_TCP_ONLY || '').toString().toLowerCase() === 'true';
      // Inspect available servers for TURN entries if forcing relay
      const dyn = Array.isArray(window.__ICE_SERVERS__) ? window.__ICE_SERVERS__ : [];
      const envTurnUrls = (import.meta.env.VITE_TURN_URL || '').split(',').map(s => s.trim()).filter(Boolean);
      const dynHas = dyn.some((s) => {
        const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
        return urls.some((u) => {
          const v = (u || '').toString().toLowerCase();
          if (!tcpOnly) return v.includes('turn:');
          return v.startsWith('turns:') || v.includes('transport=tcp');
        });
      });
      const envHas = envTurnUrls.some((u) => {
        const v = (u || '').toString().toLowerCase();
        if (!tcpOnly) return v.startsWith('turn:');
        return v.startsWith('turns:') || v.includes('transport=tcp');
      });
      const hasTurn = dynHas || envHas;
      if (forceRelay && !hasTurn) {
        setCallError('TURN required but no suitable TURN servers found. If behind a strict firewall, set VITE_TURN_TCP_ONLY=true and ensure /api/rtc/ice includes turns:443 or transport=tcp.');
        return;
      }
      setCallType(type);
      setCallPeerId(receiverId);
  const stream = await getMedia(type);
  if (!stream) throw new Error('Could not acquire media');
      const pc = createPeerConnection(receiverId);
      try { console.debug('Using ICE servers:', { dyn: window.__ICE_SERVERS__, envTurn: envTurnUrls, tcpOnly }); } catch {}
      pcRef.current = pc;
      // Ensure m-lines exist in the initial offer; add transceivers and replaceTrack to avoid duplicates
      try {
        const txs = (pc.getTransceivers && pc.getTransceivers()) || [];
        const ensureTx = (kind) => {
          let tx = txs.find(tr => (tr.kind || tr.receiver?.track?.kind) === kind);
          if (!tx) {
            try { tx = pc.addTransceiver(kind, { direction: 'sendrecv' }); } catch {}
          } else {
            try { tx.direction = 'sendrecv'; } catch {}
          }
          return tx;
        };
        const aTrack = stream.getAudioTracks()[0];
        const vTrack = stream.getVideoTracks()[0];
        if (type === 'audio' && aTrack) {
          const atx = ensureTx('audio');
          if (atx?.sender) { await atx.sender.replaceTrack(aTrack).catch(() => {}); }
          else { pc.addTrack(aTrack, stream); }
        }
        if (type === 'video') {
          // always include an audio m-line too
          if (aTrack) {
            const atx = ensureTx('audio');
            if (atx?.sender) { await atx.sender.replaceTrack(aTrack).catch(() => {}); }
            else { pc.addTrack(aTrack, stream); }
          }
          if (vTrack) {
            const vtx = ensureTx('video');
            if (vtx?.sender) { await vtx.sender.replaceTrack(vTrack).catch(() => {}); }
            else { pc.addTrack(vTrack, stream); }
          }
        }
      } catch {
        // Fallback to addTrack if transceivers not available
        stream.getTracks().forEach(track => { try { pc.addTrack(track, stream); } catch {} });
      }
  // Start a watchdog in case ICE stalls in new/checking
  scheduleIceRescue();
      // Cap TURN/TCP bitrates for stability
      try {
        pc.getSenders().forEach((s) => {
          if (!s.track) return;
          const p = s.getParameters();
          p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}];
          if (s.track.kind === 'video') {
            p.encodings[0].maxBitrate = 350_000; // ~350 kbps
            p.degradationPreference = 'maintain-framerate';
          } else if (s.track.kind === 'audio') {
            p.encodings[0].maxBitrate = 32_000; // ~32 kbps
          }
          s.setParameters(p).catch(() => {});
        });
      } catch {}
      // Prefer Opus/H264 for better interop over TURN
      try {
        const aCaps = RTCRtpSender.getCapabilities && RTCRtpSender.getCapabilities('audio');
        const vCaps = RTCRtpSender.getCapabilities && RTCRtpSender.getCapabilities('video');
        if (aCaps) {
          const opus = aCaps.codecs.find(c => (c.mimeType || '').toLowerCase() === 'audio/opus');
          if (opus) {
            const prefs = [opus, ...aCaps.codecs.filter(c => c !== opus)];
            pc.getTransceivers().filter(t => t.kind === 'audio').forEach(t => { try { t.setCodecPreferences(prefs); } catch {} });
          }
        }
        if (vCaps) {
          const h264s = vCaps.codecs.filter(c => (c.mimeType || '').toLowerCase() === 'video/h264');
          if (h264s.length) {
            const prefs = [...h264s, ...vCaps.codecs.filter(c => (c.mimeType || '').toLowerCase() !== 'video/h264')];
            pc.getTransceivers().filter(t => t.kind === 'video').forEach(t => { try { t.setCodecPreferences(prefs); } catch {} });
          }
        }
      } catch {}
  const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit("call_user", { to: receiverId, from: userData._id, offer, callType: type });
  setRinging(true);
    } catch (e) {
      console.error("startCall error", e);
      setCallError(e?.message || "Unable to start call");
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { from, offer, callType: t } = incomingCall;
    try {
  // Ensure dynamic ICE (TURN) is available for callee as well (refresh per call)
  await ensureIceServers(true);
      const forceRelay = (import.meta.env.VITE_FORCE_TURN || '').toString().toLowerCase() === 'true';
      const tcpOnly = (import.meta.env.VITE_TURN_TCP_ONLY || '').toString().toLowerCase() === 'true';
      const dyn = Array.isArray(window.__ICE_SERVERS__) ? window.__ICE_SERVERS__ : [];
      const envTurnUrls = (import.meta.env.VITE_TURN_URL || '').split(',').map(s => s.trim()).filter(Boolean);
      const dynHas = dyn.some((s) => {
        const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
        return urls.some((u) => {
          const v = (u || '').toString().toLowerCase();
          if (!tcpOnly) return v.includes('turn:');
          return v.startsWith('turns:') || v.includes('transport=tcp');
        });
      });
      const envHas = envTurnUrls.some((u) => {
        const v = (u || '').toString().toLowerCase();
        if (!tcpOnly) return v.startsWith('turn:');
        return v.startsWith('turns:') || v.includes('transport=tcp');
      });
      const hasTurn = dynHas || envHas;
      if (forceRelay && !hasTurn) {
        setCallError('TURN required but no suitable TURN servers found. If behind a strict firewall, set VITE_TURN_TCP_ONLY=true and ensure /api/rtc/ice includes turns:443 or transport=tcp.');
        return;
      }
      setCallType(t);
      setCallPeerId(from);
      const pc = createPeerConnection(from);
      try { console.debug('Using ICE servers:', { dyn: window.__ICE_SERVERS__, envTurn: envTurnUrls, tcpOnly }); } catch {}
      pcRef.current = pc;
  // Start a watchdog in case ICE stalls in new/checking (callee)
      scheduleIceRescue();
      // Apply remote offer and answer immediately to move ICE out of 'new'
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // Ensure signaling path is ready before sending the answer
  try { await ensureSocketReady(); } catch {}
  socket?.emit("answer_call", { to: from, from: userData._id, answer });
      setInCall(true);
      // drain any queued candidates (callee side)
      const queued = pendingRemoteCandidatesRef.current;
      pendingRemoteCandidatesRef.current = [];
      for (const c of queued) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      setIncomingCall(null);

      // Now get local media and add tracks; this will trigger negotiationneeded
      const stream = await getMedia(t);
      // Prefer replacing tracks into existing transceivers created by remote offer
      try {
        const txs = (pc.getTransceivers && pc.getTransceivers()) || [];
        const aTrack = stream.getAudioTracks()[0];
        const vTrack = stream.getVideoTracks()[0];
        if (aTrack) {
          let ta = txs.find(tr => (tr.kind || tr.receiver?.track?.kind) === 'audio');
          if (!ta) { try { ta = pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch {} }
          if (ta && ta.sender) {
            try { ta.direction = 'sendrecv'; } catch {}
            await ta.sender.replaceTrack(aTrack).catch(() => {});
          } else {
            pc.addTrack(aTrack, stream);
          }
        }
        if (t === 'video' && vTrack) {
          let tcv = txs.find(tr => (tr.kind || tr.receiver?.track?.kind) === 'video');
          if (!tcv) { try { tcv = pc.addTransceiver('video', { direction: 'sendrecv' }); } catch {} }
          if (tcv && tcv.sender) {
            try { tcv.direction = 'sendrecv'; } catch {}
            await tcv.sender.replaceTrack(vTrack).catch(() => {});
          } else {
            pc.addTrack(vTrack, stream);
          }
        }
      } catch {
        // Fallback to addTrack if transceivers not available
        stream.getTracks().forEach(track => {
          try { pc.addTrack(track, stream); } catch {}
        });
      }
      // Cap TURN/TCP bitrates for stability (callee)
      try {
        pc.getSenders().forEach((s) => {
          if (!s.track) return;
          const p = s.getParameters();
          p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}];
          if (s.track.kind === 'video') {
            p.encodings[0].maxBitrate = 350_000;
            p.degradationPreference = 'maintain-framerate';
          } else if (s.track.kind === 'audio') {
            p.encodings[0].maxBitrate = 32_000;
          }
          s.setParameters(p).catch(() => {});
        });
      } catch {}
      // Prefer Opus/H264 for better interop over TURN (callee)
      try {
        const aCaps = RTCRtpSender.getCapabilities && RTCRtpSender.getCapabilities('audio');
        const vCaps = RTCRtpSender.getCapabilities && RTCRtpSender.getCapabilities('video');
        if (aCaps) {
          const opus = aCaps.codecs.find(c => (c.mimeType || '').toLowerCase() === 'audio/opus');
          if (opus) {
            const prefs = [opus, ...aCaps.codecs.filter(c => c !== opus)];
            pc.getTransceivers().filter(t => t.kind === 'audio').forEach(t => { try { t.setCodecPreferences(prefs); } catch {} });
          }
        }
        if (vCaps) {
          const h264s = vCaps.codecs.filter(c => (c.mimeType || '').toLowerCase() === 'video/h264');
          if (h264s.length) {
            const prefs = [...h264s, ...vCaps.codecs.filter(c => (c.mimeType || '').toLowerCase() !== 'video/h264')];
            pc.getTransceivers().filter(t => t.kind === 'video').forEach(t => { try { t.setCodecPreferences(prefs); } catch {} });
          }
        }
      } catch {}
  // Proactively renegotiate to include local tracks and force ICE restart for callee
  try { await ensureSocketReady(); } catch {}
  try { await renegotiate('ice-restart'); } catch {}
      // Kick a watchdog: if remote media doesn't show up, try rescue steps
      try { if (remoteTrackWatchdogRef.current) clearTimeout(remoteTrackWatchdogRef.current); } catch {}
      remoteTrackWatchdogRef.current = setTimeout(async () => {
        if (!remoteStreamRef.current) {
          try { await renegotiate('ice-restart'); } catch {}
          setTimeout(async () => {
            if (!remoteStreamRef.current) {
              try { await renegotiate('ice-restart'); } catch {}
            }
          }, 8000);
        }
      }, 7000);
    } catch (e) {
      console.error("acceptCall error", e);
      setCallError(e?.message || "Failed to accept call");
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socket?.emit("reject_call", { to: incomingCall.from, from: userData._id });
    setIncomingCall(null);
    cleanupCall();
  };

  const endCall = (notifyPeer = true) => {
    try {
      if (notifyPeer && callPeerId) {
        socket?.emit("end_call", { to: callPeerId, from: userData._id });
      }
    } catch {}
    cleanupCall();
    setInCall(false);
    setCallType(null);
    setCallPeerId(null);
  setRinging(false);
  setIceState('new');
  setPcState('new');
  pendingRemoteCandidatesRef.current = [];
  setSawRelayLocal(false);
  setSawRelayRemote(false);
  };

  // Ask for confirmation before ending an active call
  const handleEndCall = async () => {
    if (!inCall && !ringing) return endCall(true);
    try {
      const ok = await (confirm ? confirm({ title: 'End call', message: 'Do you want to end the call?', confirmText: 'End', cancelText: 'Cancel' }) : Promise.resolve(true));
      if (ok) endCall(true);
    } catch {
      // ignore
    }
  };

  const cleanupCall = () => {
    try {
      pcRef.current?.getSenders()?.forEach(s => { try { s.track?.stop?.(); } catch {} });
      pcRef.current?.close?.();
    } catch {}
    pcRef.current = null;
  try { if (iceRescueTimerRef.current) clearTimeout(iceRescueTimerRef.current); } catch {}
  try { if (negoDebounceRef.current) clearTimeout(negoDebounceRef.current); } catch {}
  try { if (iceFailHangTimerRef.current) clearTimeout(iceFailHangTimerRef.current); } catch {}
  try { if (remoteTrackWatchdogRef.current) clearTimeout(remoteTrackWatchdogRef.current); } catch {}
  try { if (callerPostAnswerTimerRef.current) clearTimeout(callerPostAnswerTimerRef.current); } catch {}
  lastIceRestartAtRef.current = 0;
    localStreamRef.current?.getTracks()?.forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
  if (localVideoRef.current) localVideoRef.current.srcObject = null;
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setMuted(false);
    setCameraOff(false);
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
    setMuted(prev => !prev);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
    setCameraOff(prev => !prev);
  };

  // Screen share: replace the video sender's track with a display stream
  const toggleScreenShare = async () => {
    if (!pcRef.current) return;
    const sender = pcRef.current.getSenders?.().find(s => s.track && s.track.kind === 'video');
    if (!sender) return;
    if (!sharing) {
      try {
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const [dtrack] = ds.getVideoTracks();
        if (!dtrack) return;
        const camTrack = localStreamRef.current?.getVideoTracks?.()[0] || null;
        // Replace outgoing track
        await sender.replaceTrack(dtrack).catch(()=>{});
        setSharing(true);
        // When user stops sharing, restore camera if available
        dtrack.onended = async () => {
          try {
            if (camTrack) await sender.replaceTrack(camTrack).catch(()=>{});
            setSharing(false);
          } catch {}
        };
      } catch {}
    } else {
      try {
        const camTrack = localStreamRef.current?.getVideoTracks?.()[0] || null;
        if (camTrack) await sender.replaceTrack(camTrack).catch(()=>{});
      } catch {}
      setSharing(false);
    }
  };

  // Expose getStats to CallWindow for an optional stats panel
  const getStats = async () => {
    try { return await pcRef.current?.getStats?.(); } catch { return null; }
  };

  if (!userData?._id) {
    return (
  <div className="w-full flex items-center justify-center h-screen bg-gradient-to-br from-[#1A1F71] to-[#2C2C2C] dark:from-[#121212] dark:to-[#121212]">
  <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] p-6 rounded-lg shadow-md w-96 text-center text-gray-700 dark:text-white font-semibold">
          Please log in to use chat.
        </div>
      </div>
    );
  }

  return (
    <>
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1A1F71] to-[#2C2C2C] dark:from-[#121212] dark:to-[#121212] px-3 py-6">
  <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] w-full max-w-6xl h-[85vh] rounded-lg shadow-lg flex overflow-hidden mt-4 sm:mt-[60px]">
          {/* Left sidebar */}
          <aside className="w-72 border-r border-gray-200 dark:border-[#2C2F36] bg-gray-50 dark:bg-[#1E1E1E] flex flex-col">
            <div className="px-3 py-3 border-b border-gray-200 dark:border-[#2C2F36]">
        <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-gray-800 dark:text-white">Messages</div>
                <div className="flex items-center gap-2">
          <button className="text-[11px] px-2 py-1 rounded border border-green-600 bg-green-600 text-white hover:bg-green-700" onClick={markAllRead}>Mark all read</button>
          <button className={`text-[11px] px-2 py-1 rounded border ${pinnedOnly ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-gray-800 text-white border-gray-800 hover:bg-gray-900'}`} onClick={() => setPinnedOnly(v => !v)} title="Show only pinned">{pinnedOnly ? 'Pinned only' : 'All'}</button>
                </div>
              </div>
              <input
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search"
                className="mt-2 w-full text-sm px-3 py-2 rounded border border-gray-300 dark:border-[#2C2F36] bg-white dark:bg-[#1E1E1E] text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                @keyframes pop-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .animate-pop-in { animation: pop-in 140ms ease-out; }
              `}</style>
              {/* Inbox list */}
              <div className="px-2 py-2 flex flex-col gap-1">
                {inboxLoading && (
                  <div className="space-y-1 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-2 rounded-lg border bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#2C2F36]">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#2C2F36]" />
                          <div className="h-3 w-28 rounded bg-gray-100 dark:bg-[#2C2F36]" />
                        </div>
                        <div className="h-2 w-8 rounded bg-gray-100 dark:bg-[#2C2F36]" />
                      </div>
                    ))}
                  </div>
                )}
                {/* Pinned */}
                {pinnedInbox.length > 0 && (
                  <div className="mb-1">
                    <div className="px-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/70 mb-1">Pinned</div>
                    <div className="flex flex-col gap-1">
                      {pinnedInbox.map((row, idx) => {
                        const uid = row._id;
                        const conn = getConnById(uid);
                        const name = nameForId(uid);
                        const img = imgForId(uid);
                        const unread = row.unread || 0;
                        const lm = row.lastMessage || {};
                        return (
                          <button key={`p-${idx}`}
                            onClick={() => { setReceiverId(uid); setReceiverObj(conn || null); }}
                            className={`w-full flex items-center justify-between px-2 py-2 rounded-lg border text-gray-900 dark:text-white ${receiverId === uid ? 'bg-blue-50 dark:bg-[#1E1E1E] border-blue-300 dark:border-[#2C2F36]' : (unread > 0 ? 'bg-blue-50/40 dark:bg-[#1E1E1E] border-blue-200 dark:border-[#2C2F36]' : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#2C2F36]')} hover:bg-gray-50 dark:hover:bg-[#161616]`}>
                            <div className="flex items-center gap-2">
                              <span className="relative">
                                <img src={img} alt="" className="w-9 h-9 rounded-full border" />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${presence[uid] ? 'bg-green-500' : 'bg-gray-300'} border border-white`} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span className={`text-sm ${unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900 font-medium'} dark:text-white`}>{name}</span>
                                <span className={`text-[11px] max-w-[160px] truncate ${unread > 0 ? 'text-gray-800 font-medium dark:text-white/80' : 'text-gray-500 dark:text-white/70'}`}>{lm.post ? (<><FiPaperclip className="inline-block align-middle mr-1" />Post</>) : lm.text}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* visible pin indicator */}
                              <span className="text-yellow-500 text-sm cursor-pointer" title="Unpin" onClick={(e) => { e.stopPropagation(); togglePin(uid); }}>★</span>
                              {/* time + unread */}
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-400 dark:text-white/60">{lm.createdAt ? niceTime(lm.createdAt) : ''}</span>
                                {unread > 0 && (unread <= 2 ? (
                                  <span className="mt-0.5 inline-block w-2 h-2 rounded-full bg-blue-600" />
                                ) : (
                                  <span className="mt-0.5 inline-block min-w-5 text-[10px] leading-3 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-center">{unread}</span>
                                ))}
                              </div>
                              {/* overflow menu */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-black" onClick={() => setMenuOpenId(menuOpenId === uid ? null : uid)} aria-label="Open menu">
                                  <FiMoreVertical className="text-gray-500 dark:text-white/70" />
                                </button>
                                {menuOpenId === uid && (
                                  <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded shadow z-10">
                                    <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { togglePin(uid); setMenuOpenId(null); }}>Unpin</button>
                                    <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { toggleMuteThread(uid); setMenuOpenId(null); }}>{isMutedThread(uid) ? (<span className="inline-flex items-center gap-2"><FiBellOff />Unmute</span>) : (<span className="inline-flex items-center gap-2"><FiBellOff />Mute</span>)}</button>
                                    <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { toggleArchive(uid); setMenuOpenId(null); }}>{isArchived(uid) ? (<span className="inline-flex items-center gap-2"><FiArchive />Unarchive</span>) : (<span className="inline-flex items-center gap-2"><FiArchive />Archive</span>)}</button>
                                    <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { markReadThread(uid); setMenuOpenId(null); }}>Mark as read</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent */}
                {filteredInbox.length > 0 ? (
                  (pinnedOnly ? [] : unpinnedInbox).map((row, idx) => {
                    const uid = row._id;
                    const conn = getConnById(uid);
                    const name = nameForId(uid);
                    const img = imgForId(uid);
                    const unread = row.unread || 0;
                    const lm = row.lastMessage || {};
          return (
                      <button key={idx}
                        onClick={() => { setReceiverId(uid); setReceiverObj(conn || null); }}
            className={`w-full flex items-center justify-between px-2 py-2 rounded-lg border text-gray-900 dark:text-white ${receiverId === uid ? 'bg-blue-50 dark:bg-[#1E1E1E] border-blue-300 dark:border-[#2C2F36]' : (unread > 0 ? 'bg-blue-50/40 dark:bg-[#1E1E1E] border-blue-200 dark:border-[#2C2F36]' : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#2C2F36]')} hover:bg-gray-50 dark:hover:bg-[#161616]`}>
                        <div className="flex items-center gap-2">
                          <span className="relative">
                            <img src={img} alt="" className="w-9 h-9 rounded-full border" />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${presence[uid] ? 'bg-green-500' : 'bg-gray-300'} border border-white`} />
                          </span>
                          <div className="flex flex-col items-start">
              <span className={`text-sm ${unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900 font-medium'} dark:text-white`}>{name}</span>
                             <span className={`text-[11px] max-w-[160px] truncate ${unread > 0 ? 'text-gray-800 font-medium dark:text-white/80' : 'text-gray-500 dark:text-white/70'}`}>{lm.post ? (<><FiPaperclip className="inline-block align-middle mr-1" />Post</>) : lm.text}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* visible pin indicator */}
                          <span className={`text-sm cursor-pointer ${isPinned(uid) ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-700'}`} title={isPinned(uid) ? 'Unpin' : 'Pin'} onClick={(e) => { e.stopPropagation(); togglePin(uid); }}>{isPinned(uid) ? '★' : '☆'}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 dark:text-white/60">{lm.createdAt ? niceTime(lm.createdAt) : ''}</span>
                            {unread > 0 && (unread <= 2 ? (
                              <span className="mt-0.5 inline-block w-2 h-2 rounded-full bg-blue-600" />
                            ) : (
                              <span className="mt-0.5 inline-block min-w-5 text-[10px] leading-3 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-center">{unread}</span>
                            ))}
                          </div>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-black" onClick={() => setMenuOpenId(menuOpenId === uid ? null : uid)} aria-label="Open menu">
                              <FiMoreVertical className="text-gray-500 dark:text-white/70" />
                            </button>
                            {menuOpenId === uid && (
                              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded shadow z-10">
                                <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { togglePin(uid); setMenuOpenId(null); }}>{isPinned(uid) ? 'Unpin' : 'Pin'}</button>
                                <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { toggleMuteThread(uid); setMenuOpenId(null); }}>{isMutedThread(uid) ? (<span className="inline-flex items-center gap-2"><FiBellOff />Unmute</span>) : (<span className="inline-flex items-center gap-2"><FiBellOff />Mute</span>)}</button>
                                <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { toggleArchive(uid); setMenuOpenId(null); }}>{isArchived(uid) ? (<span className="inline-flex items-center gap-2"><FiArchive />Unarchive</span>) : (<span className="inline-flex items-center gap-2"><FiArchive />Archive</span>)}</button>
                                <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { markReadThread(uid); setMenuOpenId(null); }}>Mark as read</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500 dark:text-white/70 px-2 py-6 text-center">No recent messages</div>
                )}
              </div>
              {/* Archived */}
              {archivedInbox.length > 0 && (
                <div className="px-2 pt-1 pb-3">
                  <div className="px-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/70 mb-1 flex items-center justify-between">
                    <span>Archived</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {archivedInbox.map((row, idx) => {
                      const uid = row._id;
                      const conn = getConnById(uid);
                      const name = nameForId(uid);
                      const img = imgForId(uid);
                      const unread = row.unread || 0;
                      const lm = row.lastMessage || {};
                      return (
                        <button key={`a-${idx}`}
                          onClick={() => { setReceiverId(uid); setReceiverObj(conn || null); }}
                          className={`w-full flex items-center justify-between px-2 py-2 rounded-lg border text-gray-900 dark:text-white ${receiverId === uid ? 'bg-blue-50 dark:bg-[#1E1E1E] border-blue-300 dark:border-[#2C2F36]' : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#2C2F36]'} hover:bg-gray-50 dark:hover:bg-[#161616]`}>
                          <div className="flex items-center gap-2">
                            <span className="relative">
                              <img src={img} alt="" className="w-9 h-9 rounded-full border" />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${presence[uid] ? 'bg-green-500' : 'bg-gray-300'} border border-white`} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span className="text-sm text-gray-800 dark:text-white">{name}</span>
                              <span className="text-[11px] max-w-[160px] truncate text-gray-500 dark:text-white/70">{lm.post ? (<><FiPaperclip className="inline-block align-middle mr-1" />Post</>) : lm.text}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-gray-400 dark:text-white/60">{lm.createdAt ? niceTime(lm.createdAt) : ''}</span>
                              {unread > 0 && (unread <= 2 ? (
                                <span className="mt-0.5 inline-block w-2 h-2 rounded-full bg-blue-600" />
                              ) : (
                                <span className="mt-0.5 inline-block min-w-5 text-[10px] leading-3 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-center">{unread}</span>
                              ))}
                            </div>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-black" onClick={() => setMenuOpenId(menuOpenId === uid ? null : uid)} aria-label="Open menu">
                                <FiMoreVertical className="text-gray-500 dark:text-white/70" />
                              </button>
                              {menuOpenId === uid && (
                                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded shadow z-10">
                                  <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { toggleArchive(uid); setMenuOpenId(null); }}>Unarchive</button>
                                  <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { toggleMuteThread(uid); setMenuOpenId(null); }}>{isMutedThread(uid) ? (<span className="inline-flex items-center gap-2"><FiBellOff />Unmute</span>) : (<span className="inline-flex items-center gap-2"><FiBellOff />Mute</span>)}</button>
                                  <button className="w-full text-left text-sm px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black" onClick={() => { markReadThread(uid); setMenuOpenId(null); }}>Mark as read</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Connections fallback/section */}
              <div className="px-2 pt-1 pb-3">
                <div className="px-1 text-[11px] uppercase tracking-wide text-gray-600 dark:text-white mb-1 flex items-center justify-between">
                  <span>People</span>
                  <button className="text-[11px] text-blue-600 dark:text-blue-300" onClick={() => setShowPeople(v => !v)}>{showPeople ? 'Hide' : 'Show'}</button>
                </div>
                {showPeople && (
                  connections.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {connections.map((conn) => {
                        const displayName = nameFromConn(conn);
                        return (
                          <button key={conn._id}
                            onClick={() => { setReceiverId(conn._id); setReceiverObj(conn); }}
                            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg border ${
                              receiverId === conn._id
                ? 'bg-blue-50 dark:bg-[#1E1E1E] text-gray-900 dark:text-white border-blue-300 dark:border-[#2C2F36]'
                : 'bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-white border-gray-200 dark:border-[#2C2F36]'
              } hover:bg-gray-50 dark:hover:bg-black`}>
                            <span className="relative">
                              <img src={(conn.profileImage ? bust(conn.profileImage) : null) || dp} alt="" className="w-8 h-8 rounded-full border bg-gray-100 dark:bg-[#1E1E1E]" />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${presence[conn._id] ? 'bg-green-500' : 'bg-gray-300'} border border-white`} />
                            </span>
                            <span className="text-sm">{displayName}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-white/70 px-2 py-2">No connections yet.</div>
                  )
                )}
              </div>
            </div>
          </aside>

          {/* Right chat pane */}
          <section className="flex-1 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2C2F36] bg-white dark:bg-[#1E1E1E] flex items-center justify-between">
              {receiverObj ? (
                <button className="flex items-center gap-2 group" onClick={() => navigate(`/profile/${receiverObj.userName || receiverObj._id}`)} title="View profile">
                  <img src={(receiverObj.profileImage ? bust(receiverObj.profileImage) : null) || dp} alt="" className="w-9 h-9 rounded-full border" />
                  <div className="flex flex-col items-start">
                    <span className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-700">{receiverObj.firstName} {receiverObj.lastName}</span>
                    <span className="text-xs text-gray-600 dark:text-white">
                      {presence[receiverId]
                        ? 'Online'
                        : (lastSeenMap[receiverId] ? niceLastSeen(lastSeenMap[receiverId]) : 'Offline')}
                    </span>
                  </div>
                </button>
              ) : (
                <div className="text-base font-semibold text-gray-800 dark:text-white">Select a conversation</div>
              )}
              <div className="flex items-center gap-2">
                {uploadCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-yellow-100 text-yellow-800 border border-yellow-200" title="Active uploads">
                    <FiUploadCloud /> Uploading {uploadCount}
                  </span>
                )}
                <button
                  className="p-2 rounded-full bg-blue-50 dark:bg-[#1E1E1E] hover:bg-blue-100 dark:hover:bg-[#161616] text-blue-600 disabled:opacity-50"
                  disabled={!receiverId || inCall}
                  title="Voice call"
                  onClick={() => startCall('audio')}
                >
                  <FiPhone />
                </button>
                <button
                  className="p-2 rounded-full bg-blue-50 dark:bg-[#1E1E1E] hover:bg-blue-100 dark:hover:bg-[#161616] text-blue-600 disabled:opacity-50"
                  disabled={!receiverId || inCall}
                  title="Video call"
                  onClick={() => startCall('video')}
                >
                  <FiVideo />
                </button>
              </div>
            </div>

            {callError && (
              <div className="px-4 py-2 text-xs text-red-600 border-b border-red-100 bg-red-50">{callError}</div>
            )}

            {/* Messages */}
            <div
              ref={listRef}
              onScroll={markReadIfVisible}
              className="relative flex-1 overflow-y-auto p-3 bg-white dark:bg-[#1E1E1E] scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
              {chat.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 dark:text-white">No messages yet. Say hello!</div>
              )}
              {chat.map((msg, index) => {
                const prev = chat[index - 1];
                const showDate = !prev || !isSameDay(prev?.createdAt, msg?.createdAt);
                return (
                  <div key={index} className={`flex ${msg.incoming ? 'justify-start' : 'justify-end'} mb-2`}>
                    <div className={`w-full ${msg.incoming ? 'text-left' : 'text-right'}`}>
                      {showDate && (
                        <div className="w-full flex justify-center mb-1">
                          <span className="text-[11px] text-gray-900 dark:text-white bg-gray-200 dark:bg-[#1E1E1E] dark:border dark:border-[#2C2F36] rounded-full px-3 py-0.5">{niceDate(msg.createdAt)}</span>
                        </div>
                      )}
                      <div
                        className="inline-block max-w-[78%] relative"
                        onMouseEnter={() => setActiveReactionFor(msg.messageId)}
                        onMouseLeave={() => setActiveReactionFor((curr) => (curr === msg.messageId ? null : curr))}
                        onTouchStart={() => {
                          try { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); } catch {}
                          longPressTimerRef.current = setTimeout(() => setActiveReactionFor(msg.messageId), 400);
                        }}
                        onTouchMove={() => { try { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); } catch {} }}
                        onTouchEnd={() => { try { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); } catch {} }}
                        onFocus={() => setActiveReactionFor(msg.messageId)}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setActiveReactionFor(null); }}
                        tabIndex={0}
                      >
                        {msg.type === 'call' ? (
                          <span className="inline-block px-3 py-2 rounded-lg text-sm bg-amber-100 text-amber-900 border border-amber-200">{msg.text}</span>
                        ) : (
                          <>
                            {msg.deleted ? (
                              <span className={`inline-block px-3 py-2 rounded-2xl text-xs italic ${msg.incoming ? 'bg-gray-200 text-gray-600' : 'bg-gray-300 text-gray-700'}`}>Message deleted</span>
                            ) : editingId === msg.messageId ? (
                              <span className={`inline-flex items-center gap-2 ${msg.incoming ? 'bg-gray-200 dark:bg-[#1E1E1E] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2C2F36]' : 'bg-blue-50 text-gray-800 border border-blue-200'} rounded-2xl px-2 py-2`}>
                                <input className="text-sm bg-transparent outline-none" value={editValue} onChange={(e)=>setEditValue(e.target.value)} />
                                <button className="text-xs text-blue-600" onClick={()=>saveEdit(msg)}>Save</button>
                                <button className="text-xs text-gray-500" onClick={cancelEdit}>Cancel</button>
                              </span>
                            ) : msg.attachment ? (
                              msg.attachment.type === 'image' ? (
                                <div className="relative">
                                  <a href={msg.attachment.url} target="_blank" rel="noreferrer" className="block">
                                    <img src={msg.attachment.url} alt={msg.attachment.name || 'image'} className="rounded-lg border border-gray-200 dark:border-gray-800 max-w-[260px]" />
                                  </a>
                                  {!msg.incoming && uploadProgress[msg.clientId] != null && (
                                    <div className="absolute inset-0 bg-black/40 flex items-end rounded-lg">
                                      <div className="w-full h-1 bg-white/30">
                                        <div className="h-1 bg-white" style={{ width: `${uploadProgress[msg.clientId]}%` }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative inline-block">
                                  <a href={msg.attachment.url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm ${msg.incoming ? 'bg-gray-200 dark:bg-[#1E1E1E] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2C2F36]' : 'bg-blue-600 dark:bg-[#1E1E1E] text-white dark:text-white border border-transparent dark:border-[#2C2F36]'}`}>
                                    <FiPaperclip /> {msg.attachment.name || 'Attachment'}
                                  </a>
                                  {!msg.incoming && uploadProgress[msg.clientId] != null && (
                                    <div className="absolute left-0 right-0 bottom-0 translate-y-1">
                                      <div className="w-full h-1 bg-gray-300 dark:bg-gray-800 rounded">
                                        <div className="h-1 bg-blue-600 dark:bg-blue-400 rounded" style={{ width: `${uploadProgress[msg.clientId]}%` }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className={`inline-block px-3 py-2 rounded-2xl text-sm ${msg.incoming ? 'bg-gray-200 dark:bg-[#1E1E1E] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2C2F36]' : 'bg-blue-600 dark:bg-[#1E1E1E] text-white dark:text-white border border-transparent dark:border-[#2C2F36]'}`}>{msg.text}{msg.editedAt ? <span className="ml-1 text-[10px] opacity-70">(edited)</span> : null}</span>
                            )}
                            {/* Quick reactions popover (hover/long-press) */}
                            {!msg.deleted && activeReactionFor === msg.messageId && (
                              <div className={`absolute ${msg.incoming ? 'left-0' : 'right-0'} -top-9 z-10`}
                                   onClick={(e)=> e.stopPropagation()}
                                   onMouseDown={(e)=> e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#161616] rounded-full px-2 py-0.5 border border-gray-200 dark:border-[#2C2F36] shadow animate-pop-in" role="menu" aria-label="Add reaction">
                                  {REACTIONS.map(({ key, label, icon: Icon, color, bg }) => (
                                    <button
                                      key={key}
                                      className={`flex items-center justify-center w-7 h-7 rounded-full transition transform active:scale-95 focus:outline-none ${myReacted(msg, key) ? 'ring-1 ring-blue-400' : ''}`}
                                      style={{ color, backgroundColor: bg }}
                                      onClick={() => { quickReact(msg, key); setActiveReactionFor(null); }}
                                      title={`React ${label}`}
                                      aria-label={`React ${label}`}
                                      role="menuitem"
                                    >
                                      <Icon className="text-[14px]" aria-hidden="true" />
                                      {countReact(msg, key) > 0 && <span className="sr-only">{countReact(msg, key)} {label} reactions</span>}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Persistent reaction chips under bubble */}
                            {!msg.deleted && Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                              <div className={`mt-1 flex flex-wrap gap-1 ${msg.incoming ? 'justify-start' : 'justify-end'}`}>
                                {(() => {
                                  const presentKeys = new Set((msg.reactions || []).map(r => (EMOJI_TO_KEY[r.emoji] || r.emoji)));
                                  return REACTIONS.filter(r => presentKeys.has(r.key)).map(({ key, label, icon: Icon, color, bg }) => (
                                    <button
                                      key={key}
                                      onClick={() => quickReact(msg, key)}
                                      className={`h-5 inline-flex items-center gap-1 px-2 rounded-full text-[11px] border transition transform active:scale-95 animate-pop-in ${myReacted(msg, key) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-100 dark:bg-[#161616] border-gray-200 dark:border-[#2C2F36] text-gray-700 dark:text-white'}`}
                                      title={`${label}`}
                                      aria-label={`${label} reactions, ${countReact(msg, key)} total`}
                                      aria-pressed={myReacted(msg, key)}
                                    >
                                      <Icon className="text-[12px]" style={{ color }} aria-hidden="true" />
                                      <span className="text-[10px] leading-none">{countReact(msg, key)}</span>
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                            {/* Message actions three-dots menu (own messages, within 10 minutes) */}
                            {!msg.deleted && !msg.incoming && canModify(msg) && (
                              <div className="inline-block ml-2 align-middle relative" onClick={(e)=> e.stopPropagation()}>
                                <button
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-black text-gray-500"
                                  aria-haspopup="menu"
                                  aria-expanded={msgMenuOpenId === msg.messageId}
                                  aria-label="Message actions"
                                  onClick={() => setMsgMenuOpenId((v) => v === msg.messageId ? null : msg.messageId)}
                                >
                                  <FiMoreVertical />
                                </button>
                                {msgMenuOpenId === msg.messageId && (
                                  <div className={`absolute ${msg.incoming ? 'left-0' : 'right-0'} mt-1 w-28 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded shadow z-10`}
                                       role="menu"
                                       aria-label="Message actions menu">
                                    <button
                                      className="w-full text-left text-xs px-3 py-2 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-black"
                                      role="menuitem"
                                      onClick={() => { setMsgMenuOpenId(null); beginEdit(msg); }}
                                    >Edit</button>
                                    <button
                                      className="w-full text-left text-xs px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-black"
                                      role="menuitem"
                                      onClick={async () => {
                                        setMsgMenuOpenId(null);
                                        try {
                                          const ok = await (confirm ? confirm({ title: 'Delete message', message: 'This will delete the message for everyone. Continue?', confirmText: 'Delete', cancelText: 'Cancel' }) : Promise.resolve(true));
                                          if (ok) deleteMsg(msg);
                                        } catch {}
                                      }}
                                    >Delete</button>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Delivery status */}
                            {!msg.incoming && (
                              <div className="mt-0.5 text-[10px] text-gray-500 dark:text-white inline-flex items-center gap-0.5">
                                {msg.status === 'read' ? (
                                  <>
                                    <FiCheck className="text-blue-600 dark:text-blue-400" />
                                    <FiCheck className="-ml-2 text-blue-600 dark:text-blue-400" />
                                    <span className="ml-1 text-gray-600 dark:text-white">Read</span>
                                  </>
                                ) : msg.status === 'delivered' ? (
                                  <>
                                    <FiCheck className="dark:text-gray-700" />
                                    <FiCheck className="-ml-2 dark:text-gray-700" />
                                    <span className="ml-1 text-gray-600 dark:text-white">Delivered</span>
                                  </>
                                ) : (
                                  <>
                                    <FiCheck className="dark:text-gray-700" />
                                    <span className="ml-1 text-gray-600 dark:text-white">Sent</span>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        <div className={`mt-0.5 text-[10px] ${msg.incoming ? 'text-gray-500' : 'text-gray-500'} ${msg.incoming ? '' : 'text-right'}`}>{niceTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {showScrollDown && (
                <button onClick={scrollToBottom} className="absolute bottom-4 right-4 text-xs bg-white/90 dark:bg-[#1E1E1E]/90 text-gray-700 dark:text-white border border-gray-300 dark:border-[#2C2F36] shadow px-2 py-1 rounded">↓ Newer</button>
              )}
              {/* Bottom sentinel for reliable scrolling */}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className={`px-3 py-3 border-t border-gray-200 dark:border-[#2C2F36] bg-white dark:bg-[#1E1E1E] ${isDragging ? 'bg-blue-50' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
              <div className="flex">
        <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) enqueueFiles(files);
          e.target.value = '';
                  }}
                />
                <button
                  className="px-3 rounded-l-md border border-gray-300 dark:border-[#2C2F36] bg-gray-100 dark:bg-[#1E1E1E] hover:bg-gray-200 dark:hover:bg-[#161616] text-gray-700 dark:text-white disabled:opacity-50"
                  disabled={!receiverId}
                  title="Attach file"
                  onClick={onPickFile}
                  aria-label="Attach"
                >
                  <FiPaperclip />
                </button>
                {/* Queued previews */}
                {queuedFiles.length > 0 && (
                  <div className="w-full mb-2 flex flex-wrap gap-2">
                    {queuedFiles.map((q) => (
                      <div key={q.id} className="relative">
                        {q.isImage ? (
                          <img src={q.url} alt={q.name} className="w-20 h-20 object-cover rounded border border-gray-200 dark:border-gray-800" />
                        ) : (
                          <div className="w-40 max-w-[200px] px-2 py-1 rounded border border-gray-200 dark:border-[#2C2F36] text-xs bg-gray-50 dark:bg-[#1E1E1E] text-gray-700 dark:text-white truncate">{q.name}</div>
                        )}
                        <button
                          className="absolute -top-2 -right-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded-full w-5 h-5 text-xs leading-5 text-gray-700 dark:text-white"
                          title="Remove"
                          onClick={() => removeQueued(q.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  placeholder="Type a message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  onPaste={(e) => { const files = Array.from(e.clipboardData?.files || []); if (files.length) { e.preventDefault(); enqueueFiles(files); } }}
                  rows={1}
                  className="flex-1 p-2 border-t border-b border-gray-300 dark:border-[#2C2F36] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/60 bg-white dark:bg-[#1E1E1E] text-sm resize-none min-h-[40px] max-h-[140px]"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 rounded-r-md transition text-sm inline-flex items-center justify-center gap-1"
                  title="Send"
                  aria-label="Send message"
                  disabled={!receiverId || (!message.trim() && queuedFiles.length === 0)}
                >
                  <FiSend />
                </button>
              </div>
              {peerTyping && (
                <div className="text-xs text-gray-500 dark:text-white mt-1">Typing…</div>
              )}
              {!peerTyping && (
                <div className="text-[11px] text-gray-400 dark:text-white mt-1">Tip: Drop files here, paste images, or use the paperclip.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      <CallWindow
        incoming={Boolean(incomingCall)}
        callType={incomingCall?.callType || callType}
        inCall={inCall}
  ringing={ringing}
  iceState={iceState}
  pcState={pcState}
  relayInfo={{ local: sawRelayLocal, remote: sawRelayRemote }}
        peerName={`${receiverObj?.firstName || ''} ${receiverObj?.lastName || ''}`.trim() || 'Unknown'}
  peerImage={(receiverObj?.profileImage ? bust(receiverObj.profileImage) : null) || dp}
        minimized={minimized}
        onToggleMinimize={() => setMinimized(v => !v)}
        onAccept={acceptCall}
        onReject={rejectCall}
  onEnd={handleEndCall}
        onMuteToggle={toggleMute}
        onCamToggle={toggleCamera}
  onReconnect={() => renegotiate('ice-restart')}
  onShareToggle={toggleScreenShare}
  sharing={sharing}
  getStats={getStats}
    // Devices
    devices={devices}
    selectedMicId={selectedMicId}
    selectedCamId={selectedCamId}
    selectedSpeakerId={selectedSpeakerId}
    onSelectMic={switchMic}
    onSelectCam={switchCamera}
    onSelectSpeaker={switchSpeaker}
    onFlipCamera={flipCamera}
        muted={muted}
        cameraOff={cameraOff}
        localVideoRef={localVideoRef}
  remoteVideoRef={remoteVideoRef}
  remoteAudioRef={remoteAudioRef}
      />
    </>
  );
}

export default ChatBox;
