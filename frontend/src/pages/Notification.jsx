import React, { useContext, useEffect, useMemo, useState } from 'react';
import Nav from '../components/Nav';
import { authDataContext } from '../context/AuthContext';
import axios from 'axios';
import { RxCross1 } from "react-icons/rx";
import dp from "../assets/dp.webp";
import { userDataContext } from '../context/UserContext';
import { useToastInternal } from '../components/ui/ToastProvider';
import { useConfirm } from '../components/ui/ConfirmDialog';
import AutolinkText from '../components/ui/Autolink';
import { transformCloudinary } from '../utils/cloudinary';
import moment from 'moment';
import { bust } from '../utils/image';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

function Notification() {
  let { serverUrl } = useContext(authDataContext);
  let [notificationData, setNotificationData] = useState([]);
  let { userData, setUnreadCount } = useContext(userDataContext);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | like | comment | connectionAccepted
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const toast = useToastInternal?.();
  const confirm = useConfirm?.();
  const navigate = useNavigate();

  const handleGetNotification = async (append = false) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      let result = await axios.get(serverUrl + "/api/notification/get", { withCredentials: true, params });
      const { items = [], hasMore: more = false, total = 0 } = result.data || {};
      setNotificationData(prev => append ? [...prev, ...items] : items);
      setHasMore(Boolean(more));
      // update unread badge
      const unread = (append ? [...notificationData, ...items] : items).filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.log(error);
      toast?.error('Failed to load notifications');
    }
    finally { setLoading(false); }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await axios.delete(serverUrl + `/api/notification/deleteone/${id}`, { withCredentials: true });
      setNotificationData(prev => prev.filter(n => n._id !== id));
      toast?.success('Notification removed');
    } catch (error) {
      console.log(error);
      toast?.error('Failed to remove');
    }
  };

  const handleClearAllNotification = async () => {
    try {
      const ok = await (confirm ? confirm({ title: 'Clear all', message: 'Delete all notifications?', confirmText: 'Clear', cancelText: 'Cancel' }) : Promise.resolve(true));
      if (!ok) return;
      await axios.delete(serverUrl + "/api/notification", { withCredentials: true });
      setNotificationData([]);
      toast?.success('Cleared');
    } catch (error) {
      console.log(error);
      toast?.error('Failed to clear');
    }
  };

  const handleMessage = (type) => {
    if (type === "like") {
      return "liked your post";
    } else if (type === "comment") {
      return "commented on your post";
    } else {
      return "accepted your connection";
    }
  };

  const typeColor = (type) => {
  // Theme-aware soft badges for row accents
  if (type === "like") return "bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-800";
  if (type === "comment") return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
  return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";
  };

  useEffect(() => {
    handleGetNotification();
  }, []);

  const filtered = useMemo(() => {
    const base = filter === 'all' ? notificationData : (notificationData || []).filter(n => n.type === filter || (filter === 'connectionAccepted' && n.type === 'connectionAccepted'));
    // Group by day labels
    const groups = base.reduce((acc, n) => {
      const day = moment(n.createdAt).isSame(moment(), 'day') ? 'Today' : moment(n.createdAt).isSame(moment().subtract(1,'day'),'day') ? 'Yesterday' : moment(n.createdAt).format('MMM D, YYYY');
      (acc[day] ||= []).push(n);
      return acc;
    }, {});
    // Keep order
    return Object.entries(groups);
  }, [notificationData, filter]);

  const markRead = async (id) => {
    try {
      await axios.patch(serverUrl + `/api/notification/read/${id}`, {}, { withCredentials: true });
      setNotificationData((prev) => {
        const next = prev.map(n => n._id === id ? { ...n, read: true } : n);
        setUnreadCount(next.filter(n => !n.read).length);
        return next;
      });
    } catch {}
  };

  const markUnread = async (id) => {
    try {
      await axios.patch(serverUrl + `/api/notification/unread/${id}`, {}, { withCredentials: true });
      setNotificationData((prev) => {
        const next = prev.map(n => n._id === id ? { ...n, read: false } : n);
        setUnreadCount(next.filter(n => !n.read).length);
        return next;
      });
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await axios.patch(serverUrl + `/api/notification/read-all`, {}, { withCredentials: true });
      setNotificationData((prev) => {
        const next = prev.map(n => ({ ...n, read: true }));
        setUnreadCount(0);
        return next;
      });
    } catch {}
  };

  const onClickNotification = async (n) => {
    if (!n?.read) await markRead(n._id);
    if (n.relatedUser?.userName) navigate(`/profile/${n.relatedUser.userName}`);
  };

  return (
    <>
    <Nav />
  <div className="w-full min-h-screen px-[20px] flex flex-col items-center animate-fade-in pt-[88px]">

      {/* Top Bar */}
  <div className="w-full max-w-[900px] sticky top-[88px] z-10 card p-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg flex-1">Notifications ({notificationData.length})</span>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="input text-sm w-44" aria-label="Filter notifications">
            <option value="all">All</option>
            <option value="like">Likes</option>
            <option value="comment">Comments</option>
            <option value="connectionAccepted">Connections</option>
          </select>
          <button className="px-3 py-1 rounded-full border text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900" onClick={markAllRead}>Mark all read</button>
          {notificationData.length > 0 && (
            <button className="px-4 py-1 rounded-full border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white transition-all" onClick={handleClearAllNotification}>Clear All</button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
  <div className="w-full max-w-[900px] card flex flex-col divide-y divide-gray-100 dark:divide-[var(--gc-border)] mt-4 p-4">
          {[...Array(6)].map((_,i)=> (
            <div key={i} className="flex items-center justify-between py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200"/>
                <div>
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2"/>
                  <div className="h-3 w-32 bg-gray-200 rounded"/>
                </div>
              </div>
              <div className="w-5 h-5 bg-gray-200 rounded"/>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="w-full max-w-[900px] card flex flex-col gap-4 mt-4">
          {filtered.map(([label, group]) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-[var(--gc-muted)] px-2">{label}</div>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-[var(--gc-border)]">
                <AnimatePresence initial={false}>
                  {group.map((noti) => (
                    <motion.div
                      key={noti._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className={`flex flex-col gap-2 p-4 border-l-4 ${typeColor(noti.type)} hover:bg-gray-50 dark:hover:bg-[var(--gc-surface-soft)] transition-theme cursor-pointer ${!noti.read ? 'opacity-100' : 'opacity-80'}`}
                      onClick={() => onClickNotification(noti)}
                      role="button"
                      aria-pressed={false}
                    >
                      <div className="flex justify-between items-center">
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-[50px] h-[50px] rounded-full overflow-hidden border border-gray-200 dark:border-[var(--gc-border)]">
                            <img
                              src={(noti.relatedUser?.profileImage ? bust(noti.relatedUser.profileImage) : null) || dp}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="text-[16px] font-medium">
                            {`${noti.relatedUser?.firstName || ""} ${noti.relatedUser?.lastName || ""} ${handleMessage(noti.type)}`}
                            {!noti.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 align-middle" aria-label="unread" />}
                            <span className="ml-2 text-xs text-gray-500">{moment(noti.createdAt).fromNow()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded-full border hover:bg-gray-100 dark:hover:bg-gray-900"
                            onClick={(e) => { e.stopPropagation(); noti.read ? markUnread(noti._id) : markRead(noti._id); }}
                          >{noti.read ? 'Mark unread' : 'Mark read'}</button>
                          <RxCross1
                            className="w-6 h-6 text-gray-500 dark:text-[var(--gc-muted)] hover:text-red-500 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handleDeleteNotification(noti._id); }}
                            aria-label="Delete notification"
                            role="button"
                            tabIndex={0}
                          />
                        </div>
                      </div>

                      {/* Related Post */}
                      {noti.relatedPost && (
                        <div className="flex items-center gap-3 ml-[60px]">
                          <div className="w-[100px] h-[60px] rounded overflow-hidden border border-gray-200 dark:border-[var(--gc-border)]">
                            <img
                              src={transformCloudinary(noti.relatedPost.image, { w: 300, h: 180 })}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-gray-600 dark:text-[var(--gc-muted)] text-sm truncate max-w-[600px]">
                            <AutolinkText text={noti.relatedPost.description} />
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
          {/* Load More placeholder for future server paging */}
          {hasMore && (
            <button className="btn-secondary mx-auto mt-2" onClick={() => { setPage(p => p + 1); handleGetNotification(true); }}>Load more</button>
          )}
        </div>
      ) : (
  <div className="text-gray-600 dark:text-[var(--gc-muted)] mt-10">No notifications to show.</div>
      )}
    </div>
    </>
  );
}

export default Notification;
