import React, { useContext, useEffect, useRef, useState, memo } from 'react';
import dp from "../assets/dp.webp";
import moment from "moment";
import { FaRegCommentDots } from "react-icons/fa";
import { BiLike, BiSolidLike } from "react-icons/bi";
import { REACTIONS } from "./Reactions";
import { LuSendHorizontal } from "react-icons/lu";
import axios from 'axios';
import { authDataContext } from '../context/AuthContext';
import { userDataContext } from '../context/UserContext';
// socket handled globally in UserContext for feed updates
import ConnectionButton from './ConnectionButton';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import AutolinkText from './ui/Autolink';
import { transformCloudinary } from '../utils/cloudinary';
import { useToastInternal } from './ui/ToastProvider';
import Lightbox from './ui/Lightbox';

// Note: no local socket connection; updates flow via context

function Post(props) {
  const toast = useToastInternal?.();
  const { postData, setPostData } = useContext(userDataContext);
  // Delete post
  const handleDeletePost = async () => {
    if (!postId) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    // Optimistically remove from feed using context
    const idx = Array.isArray(postData) ? postData.findIndex(p => ((p?._id || p?.id) === postId)) : -1;
    const removed = idx >= 0 ? postData[idx] : null;
    if (idx >= 0) {
      try { setPostData(prev => prev.filter(p => ((p?._id || p?.id) !== postId))); } catch {}
    }
    let canceled = false;
    const commit = async () => {
      if (canceled) return;
      try {
        await axios.delete(`${serverUrl}/api/post/delete/${postId}`, { withCredentials: true });
      } catch (error) {
        // Revert on error
        if (removed && idx >= 0) {
          try {
            setPostData(prev => {
              const exists = prev.some(p => ((p?._id || p?.id) === postId));
              if (exists) return prev;
              const arr = prev.slice();
              arr.splice(idx, 0, removed);
              return arr;
            });
          } catch {}
        }
        toast?.error?.('Failed to delete post');
      }
    };
    const timer = setTimeout(commit, 5000);
    toast?.action?.({ text: 'Post deleted', actionText: 'Undo', onAction: () => {
      canceled = true;
      clearTimeout(timer);
      if (removed && idx >= 0) {
        try {
          setPostData(prev => {
            const exists = prev.some(p => ((p?._id || p?.id) === postId));
            if (exists) return prev;
            const arr = prev.slice();
            arr.splice(idx, 0, removed);
            return arr;
          });
        } catch {}
      }
    }});
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!postId || !commentId) return;
    if (!window.confirm("Delete this comment?")) return;
    const prev = comments;
    setComments(prev.filter(c => c._id !== commentId));
    let canceled = false;
    const commit = async () => {
      if (canceled) return;
      try {
        await axios.delete(`${serverUrl}/api/post/comment/${postId}/${commentId}`, { withCredentials: true });
      } catch (error) {
        setComments(prev);
        toast?.error?.('Failed to delete comment');
      }
    };
    const timer = setTimeout(commit, 5000);
    toast?.action?.({ text: 'Comment deleted', actionText: 'Undo', onAction: () => {
      canceled = true;
      clearTimeout(timer);
      setComments(prev);
    }});
  };
  const {
    id, _id, author = {}, like = [], comment = [], description = "",
    image, createdAt, repostedFrom,
  } = props;

  const postId = id || _id;

  const [more, setMore] = useState(false);
  const { serverUrl } = useContext(authDataContext);
  const { userData, handleGetProfile } = useContext(userDataContext);

  const [reactions, setReactions] = useState(props.reactions || []);
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(null);
  // Count for each reaction type
  const reactionCounts = REACTIONS.reduce((acc, r) => {
    acc[r.key] = reactions.filter(rx => rx.type === r.key).length;
    return acc;
  }, {});
  const totalReactions = reactions.length;
  const paletteTimers = useRef({ closeTimer: null, longPressTimer: null, longPress: false });
  // Keyboard navigation for reaction palette
  const paletteBtnRefs = useRef([]);
  const paletteId = useRef(`reactions-${postId || Math.random().toString(36).slice(2)}`);

  const handlePaletteButtonKeyDown = (e, idx, key) => {
    const k = e.key?.toLowerCase?.();
    if (k === 'enter' || k === ' ') {
      e.preventDefault();
      handleReaction(key);
      return;
    }
    if (k === 'arrowright') {
      e.preventDefault();
      const next = (idx + 1) % REACTIONS.length;
      paletteBtnRefs.current[next]?.focus?.();
    } else if (k === 'arrowleft') {
      e.preventDefault();
      const prev = (idx - 1 + REACTIONS.length) % REACTIONS.length;
      paletteBtnRefs.current[prev]?.focus?.();
    } else if (k === 'escape') {
      setShowReactions(false);
    }
  };

  const openPalette = () => {
    if (paletteTimers.current.closeTimer) {
      clearTimeout(paletteTimers.current.closeTimer);
      paletteTimers.current.closeTimer = null;
    }
    setShowReactions(true);
  };
  const closePalette = (delay = 120) => {
    if (paletteTimers.current.closeTimer) clearTimeout(paletteTimers.current.closeTimer);
    paletteTimers.current.closeTimer = setTimeout(() => setShowReactions(false), delay);
  };
  const handlePressStart = () => {
    if (paletteTimers.current.longPressTimer) clearTimeout(paletteTimers.current.longPressTimer);
    paletteTimers.current.longPress = false;
    paletteTimers.current.longPressTimer = setTimeout(() => {
      paletteTimers.current.longPress = true;
      openPalette();
    }, 450);
  };
  const handlePressEnd = (e) => {
    if (paletteTimers.current.longPressTimer) clearTimeout(paletteTimers.current.longPressTimer);
    if (paletteTimers.current.longPress) {
      // Suppress the click that follows a long press
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    // reset flag shortly after
    setTimeout(() => { paletteTimers.current.longPress = false; }, 0);
  };
  const [commentContent, setCommentContent] = useState("");
  const [comments, setComments] = useState(comment || []);
  const [showComment, setShowComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    setReactions(props.reactions || []);
    setComments(comment || []);
    // Set my reaction
    if (props.reactions && userData?._id) {
      const mine = props.reactions.find(r => r.user && (r.user._id === userData._id || r.user === userData._id));
      setMyReaction(mine ? mine.type : null);
    }
  }, [props.reactions, comment, userData]);

  // Real-time updates handled by UserContext; this component just reflects props

  // Handle reaction click (like, love, wow, sad, angry)
  const handleReaction = async (type) => {
    if (!postId) {
      console.warn("Missing postId — pass id={post._id}");
      return;
    }
    setMyReaction(prev => (prev === type ? null : type));
    try {
      const res = await axios.post(
        `${serverUrl}/api/post/like/${postId}`,
        { type },
        { withCredentials: true }
      );
      setReactions(res.data?.reactions || []);
      const mine = (res.data?.reactions || []).find(r => r.user && (r.user._id === userData?._id || r.user === userData?._id));
      setMyReaction(mine ? mine.type : null);
      setShowReactions(false);
    } catch (error) {
      console.log("Like error:", error);
      setMyReaction(prev => (prev === type ? null : type));
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!postId) {
      console.warn("Missing postId — pass id={post._id}");
      return;
    }
    const content = commentContent.trim();
    if (!content || isSubmittingComment) return;
    // Optimistic update
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      user: {
        _id: userData?._id,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        profileImage: userData?.profileImage,
      },
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setIsSubmittingComment(true);
    setComments((prev) => [...(prev || []), optimistic]);
    setCommentContent("");
    try {
      const res = await axios.post(
        `${serverUrl}/api/post/comment/${postId}`,
        { content },
        { withCredentials: true }
      );
      setComments(res.data?.comment || []);
    } catch (error) {
      // Rollback
      setComments((prev) => (prev || []).filter((c) => c._id !== tempId));
      console.log("Comment error:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };


  // Handler for reposting a post
  const handleRepost = async () => {
    if (!postId) return;
    try {
      await axios.post(`${serverUrl}/api/post/repost/${postId}`, {}, { withCredentials: true });
      alert("Reposted successfully!");
    } catch (error) {
      alert("Failed to repost");
    }
  };

  // Quote Repost
  const [showQuote, setShowQuote] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const handleQuoteRepost = async () => {
    if (!postId) return;
    try {
      await axios.post(`${serverUrl}/api/post/repost/${postId}/quote`, { quote: quoteText }, { withCredentials: true });
      setShowQuote(false);
      setQuoteText("");
      alert("Reposted with quote!");
    } catch (e) { alert("Failed to quote repost"); }
  };

  // Save/Unsave post
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const cardRef = useRef(null);
  const toggleSave = async () => {
    if (!postId || isSaving) return;
    setIsSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = await axios.post(`${serverUrl}/api/post/save/${postId}`, {}, { withCredentials: true });
      if (typeof res.data?.saved === 'boolean' && res.data.saved !== next) {
        setSaved(res.data.saved);
      }
    } catch (e) {
      setSaved(!next);
      alert("Failed to update saved status");
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize saved state from userData if available
  useEffect(() => {
    try {
      const list = userData?.savedPosts || [];
      if (postId && Array.isArray(list)) {
        const exists = list.some(p => (p?._id || p)?.toString?.() === postId?.toString?.());
        setSaved(Boolean(exists));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.savedPosts, postId]);

  // Close three-dots menu on outside click / ESC
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Keyboard shortcuts when card focused
  const onKeyDown = (e) => {
    // Ignore when typing inside inputs, textareas, selects or contenteditable elements
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    const isInteractive =
      t?.tagName === 'INPUT' ||
      t?.tagName === 'TEXTAREA' ||
      t?.tagName === 'SELECT' ||
      t?.isContentEditable ||
      t?.closest?.('input, textarea, select, [contenteditable="true"]');
    if (isInteractive) return;

    const k = e.key?.toLowerCase?.();
    if (k === 'l') {
      handleReaction(myReaction === 'like' ? 'like' : 'like');
    } else if (k === 'c') {
      setShowComment(v => !v);
    } else if (k === 's') {
      toggleSave();
    }
  };

  // Share to Connection modal state (upgraded)
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedConnections, setSelectedConnections] = useState([]); // array of ids
  const [shareSearch, setShareSearch] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Open share modal and reset state
  const handleShareToConnection = () => {
    setShareSearch("");
    setShareNote("");
    setSelectedConnections([]);
    setShowShareModal(true);
  };

  const toggleSelectConnection = (id) => {
    setSelectedConnections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Send to one or more connections (loops API calls)
  const handleSendToConnection = async () => {
    if (!postId || selectedConnections.length === 0) return;
    setShareLoading(true);
    let ok = 0, fail = 0;
    for (const to of selectedConnections) {
      try {
        await axios.post(
          `${serverUrl}/api/chat/share-post`,
          { to, postId, note: shareNote },
          { withCredentials: true }
        );
        ok++;
      } catch {
        fail++;
      }
    }
    setShareLoading(false);
    setShowShareModal(false);
    alert(`Shared to ${ok} connection${ok!==1?'s':''}${fail?`, ${fail} failed`:''}.`);
  };

  return (
    <div ref={cardRef} tabIndex={0} onKeyDown={onKeyDown} className="w-full min-h-[200px] flex flex-col gap-4 card p-5 transition-all hover:shadow-lg focus:outline-none">
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div
          className='flex gap-3 items-start cursor-pointer'
          onClick={() => author?.userName && handleGetProfile(author.userName)}
        >
          <div className='w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center border border-gray-200 shadow-sm'>
            <img src={author?.profileImage || dp} alt="" className='h-full w-full object-cover' />
          </div>
          <div>
            <div className='text-lg font-semibold text-[#0A66C2] hover:text-[#084d8a] transition-colors'>
              {`${author?.firstName ?? ""} ${author?.lastName ?? ""}`}
            </div>
            <div className='text-sm text-gray-600'>{author?.headline}</div>
            <div className='text-xs text-gray-500'>{createdAt ? moment(createdAt).fromNow() : ""}</div>
            {repostedFrom && (
              <div className='text-xs text-gray-600'>
                Reposted from
                <button
                  className='ml-1 text-[#0A66C2] hover:underline'
                  onClick={(e) => {
                    e.stopPropagation();
                    if (repostedFrom?.userName) handleGetProfile(repostedFrom.userName);
                  }}
                >
                  {`${repostedFrom?.firstName ?? ''} ${repostedFrom?.lastName ?? ''}`}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="More options"
          >
            <HiOutlineDotsHorizontal className="w-5 h-5 text-gray-600 dark:text-white" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2F36] rounded-md shadow-lg z-20">
              <ul className="py-1 text-sm text-gray-700 dark:text-white">
                {userData?._id && author?._id && userData._id === author._id ? (
                  <li>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 text-red-600" onClick={handleDeletePost}>Delete post</button>
                  </li>
                ) : (
                  <li>
                    <div className="px-4 py-2"><ConnectionButton userId={author?._id} /></div>
                  </li>
                )}
                <li>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-900" onClick={handleRepost}>Repost</button>
                </li>
                <li>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-900" onClick={() => setShowQuote(true)}>Quote repost</button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>


      {/* Post image */}
      {image && (
        <div className="w-full flex justify-center items-center my-2" onDoubleClick={() => handleReaction('like')} aria-label="Post image">
          <img
            src={transformCloudinary(image, { w: 1200, h: 1200, c: 'limit' })}
            alt="Post"
            className="max-h-96 rounded-lg object-contain select-none cursor-zoom-in hover:opacity-95 transition"
            draggable={false}
            loading="lazy"
            onClick={() => setLightboxOpen(true)}
          />
          <Lightbox open={lightboxOpen} src={image} alt="Post" onClose={() => setLightboxOpen(false)} />
        </div>
      )}

      {/* Post description */}
  <div className={`w-full ${!more ? "max-h-[100px] overflow-hidden" : ""} pl-[60px] text-gray-800 dark:text-white`} onDoubleClick={() => handleReaction('like')}>
        <AutolinkText
          text={description}
          onMentionClick={(handle) => handle && handleGetProfile(handle)}
          onHashtagClick={(tag) => alert(`#${tag} coming soon`)}
        />
      </div>
      {description?.length > 120 && (
        <div
          className="pl-[60px] text-sm font-medium text-[#0077b5] dark:text-blue-300 cursor-pointer hover:underline"
          onClick={() => setMore(prev => !prev)}
        >
          {more ? "Read less..." : "Read more..."}
        </div>
      )}




  {/* Primary actions: Like/Reaction, Comment, Share, Save */}
  <div className='flex flex-wrap justify-around items-center text-gray-700 font-medium py-2 relative gap-2'>
    {/* Like/Reaction with hover + long-press */}
    <div
      className='relative inline-block'
      onMouseEnter={openPalette}
      onMouseLeave={() => closePalette(120)}
    >
  <button
        onClick={(e) => {
          if (paletteTimers.current.longPress) return; // ignore click right after long-press
          handleReaction(myReaction === null ? 'like' : myReaction);
        }}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        disabled={!postId}
        title={!postId ? "Missing postId" : (myReaction ? 'Remove reaction' : 'Like')}
        className={`flex items-center gap-2 ${myReaction ? 'text-[#0A66C2]' : 'hover:text-[#0A66C2]'}`}
      >
        {myReaction ? (
          <span style={{ color: REACTIONS.find(r => r.key === myReaction)?.color }}>
            {React.createElement(REACTIONS.find(r => r.key === myReaction)?.icon, { className: 'w-5 h-5' })}
          </span>
        ) : (
          <BiLike className='w-5 h-5' />
        )}
  <span>{myReaction ? REACTIONS.find(r => r.key === myReaction)?.label : "Like"}</span>
  <span className='text-xs text-gray-500' aria-label={`Total reactions ${totalReactions}`}>({totalReactions})</span>
      </button>
      {/* Reaction palette on hover/focus */}
      {showReactions && (
        <div
          id={paletteId.current}
          role="menu"
          aria-label="Reactions"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[var(--gc-surface)]/90 backdrop-blur-md shadow-xl rounded-2xl flex gap-2 px-3 py-2 z-20 border border-gray-200 dark:border-[var(--gc-border)]"
          onMouseEnter={openPalette}
          onMouseLeave={() => closePalette(80)}
        >
          {REACTIONS.map((r, idx) => (
            <button
              key={r.key}
              ref={(el) => (paletteBtnRefs.current[idx] = el)}
              title={r.label}
              role="menuitem"
              aria-label={`${r.label} ${reactionCounts[r.key] || 0}`}
              onKeyDown={(e) => handlePaletteButtonKeyDown(e, idx, r.key)}
              onClick={() => handleReaction(r.key)}
              style={{ color: r.color }}
              className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--gc-primary)] ${myReaction === r.key ? 'ring-2 ring-[var(--gc-primary)]' : ''}`}
            >
              {React.createElement(r.icon, { className: 'w-5 h-5' })}
              {reactionCounts[r.key] > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/80 text-white dark:bg-white/90 dark:text-black border border-white/40">
                  {reactionCounts[r.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
        {/* Comment */}
        <button
          className='flex items-center gap-2 hover:text-[#0077b5] dark:hover:text-blue-300'
          onClick={() => setShowComment(prev => !prev)}
          aria-label="Toggle comments"
        >
          <span className='flex items-center gap-1'>
            <FaRegCommentDots className='w-5 h-5' />
            <span>Comment</span>
            <span className='text-xs text-gray-500 ml-1'>({comments?.length || 0})</span>
          </span>
        </button>
  {/* Repost and Quote moved to three-dots menu above */}
        {/* Save */}
        <button
          className={`flex items-center gap-2 ${saved ? 'text-yellow-600 dark:text-white' : 'hover:text-yellow-600 dark:hover:text-white'}`}
          onClick={toggleSave}
          aria-label={saved ? 'Unsave post' : 'Save post'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M5.25 3A2.25 2.25 0 003 5.25v14.69a.75.75 0 001.2.6l6.3-4.725a.75.75 0 01.9 0l6.3 4.725a.75.75 0 001.2-.6V5.25A2.25 2.25 0 0018.75 3h-13.5z" />
          </svg>
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
  {/* Share to Connection */
  }
        <button
          className='flex items-center gap-2 hover:text-purple-600'
          onClick={handleShareToConnection}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 2.25l-9.193 9.193m0 0l-3.182 8.182a.563.563 0 00.728.728l8.182-3.182m-5.728-5.728l8.182-8.182a.563.563 0 01.728.728l-8.182 8.182z" />
          </svg>
          <span>Share to Connection</span>
        </button>
      </div>
      {/* Share to Connection Modal (upgraded) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-lg p-5 w-full max-w-md shadow-lg relative border border-gray-200 dark:border-[#2C2F36]">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              onClick={() => setShowShareModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-3">Share post to connection(s)</h3>
            {Array.isArray(userData?.connections) && userData.connections.length > 0 ? (
              <>
                <input
                  className="input mb-3"
                  placeholder="Search connections"
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.stopPropagation()}
                />
                {/* Selected chips */}
                {selectedConnections.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedConnections.map((id) => {
                      const c = userData.connections.find((x) => x._id === id);
                      if (!c) return null;
                      return (
                        <span key={id} className="chip">
                          <img src={c.profileImage || dp} alt="" className="w-4 h-4 rounded-full mr-1" />
                          <span className="truncate max-w-[120px]">{c.firstName} {c.lastName}</span>
                          <button
                            className="ml-1 text-xs text-gray-500 hover:text-red-500"
                            onClick={(e) => { e.preventDefault(); toggleSelectConnection(id); }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Connections list */}
                <div className="max-h-60 overflow-auto rounded-md border border-gray-200 dark:border-[#2C2F36] divide-y divide-gray-100 dark:divide-[#2C2F36]">
                  {(userData.connections.filter((c) => {
                    const q = shareSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (c.firstName || '').toLowerCase().includes(q) ||
                      (c.lastName || '').toLowerCase().includes(q) ||
                      (c.userName || '').toLowerCase().includes(q)
                    );
                  }) || []).map((c) => (
                    <label key={c._id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(c._id)}
                        onChange={() => toggleSelectConnection(c._id)}
                      />
                      <img src={c.profileImage || dp} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-white truncate">{c.firstName} {c.lastName}</div>
                        {c.userName && <div className="text-xs text-gray-500 truncate">@{c.userName}</div>}
                      </div>
                    </label>
                  ))}
                  {userData.connections.filter((c) => {
                    const q = shareSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (c.firstName || '').toLowerCase().includes(q) ||
                      (c.lastName || '').toLowerCase().includes(q) ||
                      (c.userName || '').toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No matches</div>
                  )}
                </div>
                <textarea
                  className="input h-24 mt-3"
                  placeholder="Add a note (optional)"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button className="btn-secondary" onClick={() => setShowShareModal(false)}>Cancel</button>
                  <button
                    className="btn-primary disabled:opacity-50"
                    disabled={selectedConnections.length === 0 || shareLoading}
                    onClick={handleSendToConnection}
                  >
                    {shareLoading ? 'Sharing…' : `Share to ${selectedConnections.length || ''}`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-white/80">No connections found.</div>
            )}
          </div>
        </div>
      )}
      {/* Reaction summary row */}
      {totalReactions > 0 && (
        <div className='pl-[60px] -mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600'>
          {REACTIONS.filter(r => reactionCounts[r.key] > 0).map(r => (
            <button
              key={r.key}
              onClick={() => handleReaction(r.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full border ${myReaction === r.key ? 'border-[#0A66C2] text-[#0A66C2]' : 'border-gray-200 hover:border-gray-300'}`}
              title={`${r.label}: ${reactionCounts[r.key]}`}
              aria-label={`${r.label} count ${reactionCounts[r.key]}`}
            >
              <span style={{ color: r.color }}>
                {React.createElement(r.icon, { className: 'w-4 h-4' })}
              </span>
              <span>{reactionCounts[r.key]}</span>
            </button>
          ))}
        </div>
      )}
      {/* Quote Modal */}
      {showQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-lg p-5 w-full max-w-md shadow-lg relative border border-gray-200 dark:border-[#2C2F36]">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500" onClick={() => setShowQuote(false)}>&times;</button>
            <h3 className="text-lg font-semibold mb-3">Add a comment to your repost</h3>
            <textarea className="input h-28" value={quoteText} onChange={(e)=>setQuoteText(e.target.value)} placeholder="Say something about this..." onKeyDown={(e) => e.stopPropagation()} />
            <button className="mt-3 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700" onClick={handleQuoteRepost}>Repost</button>
          </div>
        </div>
      )}
      {/* Comments section */}
      {showComment && (
        <div className='mt-2'>
          <form className="flex items-center gap-2" onSubmit={handleComment}>
            <input
              type="text"
              placeholder="Leave a comment..."
              className='input flex-1 h-10'
              autoComplete="off"
              spellCheck={false}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              onKeyDown={(e) => { /* prevent parent shortcuts while typing */ e.stopPropagation(); }}
            />
            <button type="submit" disabled={!postId || isSubmittingComment} title={!postId ? "Missing postId" : (isSubmittingComment ? "Posting..." : "Send")}>
              <LuSendHorizontal className="text-[#07a4ff] w-5 h-5" />
            </button>
          </form>

          {/* Comment list */}
          <div className='mt-3 flex flex-col gap-3'>
            {comments?.map((com) => (
              <div key={com._id} className={`flex flex-col gap-1 border-b border-gray-200 pb-2 ${com.optimistic ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className='w-[35px] h-[35px] rounded-full overflow-hidden'>
                    <img src={com.user?.profileImage || dp} alt="" className='h-full w-full object-cover' />
                  </div>
                  <div className='text-sm font-semibold text-[#0A66C2]'>{`${com.user?.firstName ?? ""} ${com.user?.lastName ?? ""}`}</div>
                  {/* Delete comment button for comment owner */}
                  {(!com.optimistic) && userData?._id && com.user?._id && userData._id === com.user._id && (
                    <button
                      className="text-xs text-red-500 hover:underline ml-2"
                      onClick={() => handleDeleteComment(com._id)}
                      title="Delete Comment"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className='pl-[45px] text-sm text-gray-700 dark:text-white'>
                  <AutolinkText
                    text={com.content}
                    onMentionClick={(handle) => handle && handleGetProfile(handle)}
                    onHashtagClick={(tag) => alert(`#${tag} coming soon`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Post);
