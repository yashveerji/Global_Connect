import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { authDataContext } from './AuthContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { makeSocket } from '../services/socket'
export const userDataContext=createContext()

function UserContext({children}) {
let [userData,setUserData]=useState(null)
let {serverUrl}=useContext(authDataContext)
let [edit,setEdit]=useState(false)
let [postData,setPostData]=useState([])
let [profileData,setProfileData]=useState([])
let navigate=useNavigate()
const socketRef = useRef(null)
const [socket, setSocket] = useState(null)
// Global unread notification count (simple client-side)
const [unreadCount, setUnreadCount] = useState(0)
// Global chat unread count
const [chatUnreadCount, setChatUnreadCount] = useState(0)
const getCurrentUser=async ()=>{
    try {
        const cacheBust = `&_=${Date.now()}`;
        let result=await axios.get(`${serverUrl}/api/user/currentuser?__nocache=1${cacheBust}`,
          { withCredentials:true, headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
        )
        setUserData(result.data)
        return
    } catch (error) {
        console.log(error);
        setUserData(null)
    }
}

const getPost=async ()=>{
  try {
    let result=await axios.get(serverUrl+"/api/post/getpost",{
      withCredentials:true
    })
    const data = result.data;
    const items = Array.isArray(data) ? data : (data?.items || []);
    setPostData(items)
  } catch (error) {
    console.log(error)
  }
}

const handleGetProfile=async (userName)=>{
   try {
    let result=await axios.get(serverUrl+`/api/user/profile/${userName}`,{
      withCredentials:true
    })
    setProfileData(result.data)
    navigate("/profile")
   } catch (error) {
    console.log(error)
   }
}



useEffect(() => {
  getCurrentUser();
  getPost();
  // re-run if backend base URL changes
}, [serverUrl]);

// When the logged-in user identity changes, clear stale views and refetch
useEffect(() => {
  // Clear profile page data so it doesn't show previous account
  setProfileData([]);
  // Optionally refresh posts for the new user context
  if (userData?._id) {
    getPost();
  } else {
    setPostData([]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userData?._id]);

// App-wide realtime feed updates
useEffect(() => {
  // require server url
  if (!serverUrl) return;
  // avoid multiple sockets
  if (socketRef.current?.socket?.connected) return;
  const { socket: sock, register } = makeSocket(serverUrl, userData?._id);
  socketRef.current = { socket: sock, register };
  setSocket(sock);
  if (userData?._id) register(userData._id);
  // Re-register on reconnects
  const onConnect = () => { try { if (userData?._id) register(userData._id); } catch {} };

  const onPostCreated = (post) => {
    if (!post || !post._id) return;
    setPostData(prev => {
      const exists = prev.some(p => (p._id || p.id) === post._id);
      return exists ? prev : [post, ...prev];
    });
  };
  const onPostDeleted = ({ postId }) => {
    if (!postId) return;
    setPostData(prev => prev.filter(p => (p._id || p.id) !== postId));
  };
  const onLikeUpdated = ({ postId, reactions }) => {
    if (!postId) return;
    setPostData(prev => prev.map(p => ((p._id || p.id) === postId ? { ...p, reactions: reactions || [] } : p)));
  };
  const onCommentAdded = ({ postId, comm }) => {
    if (!postId) return;
    setPostData(prev => prev.map(p => ((p._id || p.id) === postId ? { ...p, comment: comm || [] } : p)));
  };
  const onCommentLikeUpdated = ({ postId, commentId, likes }) => {
    if (!postId || !commentId) return;
    setPostData(prev => prev.map(p => {
      if ((p._id || p.id) !== postId) return p;
      const list = Array.isArray(p.comment) ? p.comment.map(c => (
        (c._id || c.id) === commentId ? { ...c, likes: likes || [] } : c
      )) : [];
      return { ...p, comment: list };
    }));
  };
  const onCommentReplied = ({ postId, commentId, replies }) => {
    if (!postId || !commentId) return;
    setPostData(prev => prev.map(p => {
      if ((p._id || p.id) !== postId) return p;
      const list = Array.isArray(p.comment) ? p.comment.map(c => (
        (c._id || c.id) === commentId ? { ...c, replies: replies || [] } : c
      )) : [];
      return { ...p, comment: list };
    }));
  };
  const onReplyLikeUpdated = ({ postId, commentId, replyId, likes }) => {
    if (!postId || !commentId || !replyId) return;
    setPostData(prev => prev.map(p => {
      if ((p._id || p.id) !== postId) return p;
      const list = Array.isArray(p.comment) ? p.comment.map(c => {
        if ((c._id || c.id) !== commentId) return c;
        const reps = (c.replies || []).map(r => ((r._id || r.id) === replyId ? { ...r, likes: likes || [] } : r));
        return { ...c, replies: reps };
      }) : [];
      return { ...p, comment: list };
    }));
  };
  const onCommentDeleted = ({ postId, commentId }) => {
    if (!postId || !commentId) return;
    setPostData(prev => prev.map(p => {
      if ((p._id || p.id) !== postId) return p;
      const list = Array.isArray(p.comment) ? p.comment.filter(c => (c._id || c.id) !== commentId) : [];
      return { ...p, comment: list };
    }));
  };
  const onReplyDeleted = ({ postId, commentId, replyId }) => {
    if (!postId || !commentId || !replyId) return;
    setPostData(prev => prev.map(p => {
      if ((p._id || p.id) !== postId) return p;
      const list = Array.isArray(p.comment) ? p.comment.map(c => {
        if ((c._id || c.id) !== commentId) return c;
        const reps = (c.replies || []).filter(r => (r._id || r.id) !== replyId);
        return { ...c, replies: reps };
      }) : [];
      return { ...p, comment: list };
    }));
  };

  sock.on('connect', onConnect);
  sock.on('postCreated', onPostCreated);
  sock.on('postDeleted', onPostDeleted);
  sock.on('likeUpdated', onLikeUpdated);
  sock.on('commentAdded', onCommentAdded);
  sock.on('commentDeleted', onCommentDeleted);
  sock.on('replyDeleted', onReplyDeleted);
  sock.on('commentLikeUpdated', onCommentLikeUpdated);
  sock.on('commentReplied', onCommentReplied);
  sock.on('replyLikeUpdated', onReplyLikeUpdated);

  return () => {
  sock.off('connect', onConnect);
  sock.off('postCreated', onPostCreated);
  sock.off('postDeleted', onPostDeleted);
  sock.off('likeUpdated', onLikeUpdated);
  sock.off('commentAdded', onCommentAdded);
  sock.off('commentDeleted', onCommentDeleted);
  sock.off('replyDeleted', onReplyDeleted);
  sock.off('commentLikeUpdated', onCommentLikeUpdated);
  sock.off('commentReplied', onCommentReplied);
  sock.off('replyLikeUpdated', onReplyLikeUpdated);
  try { sock.disconnect(); } catch {}
    socketRef.current = null;
  setSocket(null);
  };
// rebind when user id becomes available
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [serverUrl, userData?._id]);

// If socket exists but userId becomes available later, register then
useEffect(() => {
  const sock = socketRef.current?.socket;
  if (sock && userData?._id) {
    try { sock.emit('register', userData._id); } catch {}
  }
}, [userData?._id]);


  const value={
    userData,
    setUserData,
    edit,
    setEdit,
    postData,
    setPostData,
    getPost,
    handleGetProfile,
    profileData,
    setProfileData,
  // expose app-wide socket (reactive)
  socket,
  unreadCount,
  setUnreadCount,
  chatUnreadCount,
  setChatUnreadCount
  }
  return (
    <userDataContext.Provider value={value}>
      {children}
    </userDataContext.Provider>
  )
}

export default UserContext
