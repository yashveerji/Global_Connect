import React, { useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from 'framer-motion'
import dp from "../assets/dp.webp";
import { FiPlus, FiCamera } from "react-icons/fi";
import { userDataContext } from "../context/UserContext";
import EditProfile from "../components/EditProfile";
import { RxCross1 } from "react-icons/rx";
import { BsImage } from "react-icons/bs";
import axios from "axios";
import { authDataContext } from "../context/AuthContext";
import Post from "../components/Post";
import AIChat from "../components/AIChat";


function Home() {
  const { userData, edit, setEdit, postData, getPost, handleGetProfile } =
    useContext(userDataContext);
  const { serverUrl } = useContext(authDataContext);

  const [frontendImage, setFrontendImage] = useState("");
  const [backendImage, setBackendImage] = useState("");
  const [description, setDescription] = useState("");
  const [uploadPost, setUploadPost] = useState(false);
  const [posting, setPosting] = useState(false);
  const [suggestedUser, setSuggestedUser] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const image = useRef();

  // Animations
  const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } };
  const cardIn = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } };
  const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.22 } } };

  const handleImage = (e) => {
    const file = e.target.files[0];
    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  const handleUploadPost = async () => {
    setPosting(true);
    try {
      const formdata = new FormData();
      formdata.append("description", description);
      if (backendImage) formdata.append("image", backendImage);
      await axios.post(serverUrl + "/api/post/create", formdata, {
        withCredentials: true,
      });
      setPosting(false);
      setUploadPost(false);
    } catch (error) {
      setPosting(false);
      console.log(error);
    }
  };

  const handleSuggestedUsers = async () => {
    try {
      const result = await axios.get(serverUrl + "/api/user/suggestedusers", {
        withCredentials: true,
      });
      setSuggestedUser(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    handleSuggestedUsers();
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoadingFeed(true);
      try { await getPost(); } finally { setLoadingFeed(false); }
    };
    run();
  }, [uploadPost]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (uploadPost) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [uploadPost]);

  return (
    <motion.div
      className="w-full min-h-screen flex flex-col lg:flex-row p-5 gap-5 relative"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {edit && <EditProfile />}

      {/* Left Sidebar */}
      <div className="w-full lg:w-[25%] flex flex-col gap-5 mt-[90px]">
        {/* Profile Card */}
        <motion.div className="card p-5 flex flex-col items-center relative" variants={cardIn} initial="hidden" animate="visible">
          <div
            className="relative w-[80px] h-[80px] rounded-full overflow-hidden border-4 cursor-pointer"
            onClick={() => setEdit(true)}
            style={{ borderColor: 'var(--gc-primary)' }}
          >
            <img
              src={userData.profileImage || dp}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <FiCamera className="absolute bottom-2 right-2 bg-black/50 dark:bg-black/60 p-1 rounded-full text-white" />
          </div>
          <h2 className="mt-3 font-semibold text-lg">{`${userData.firstName} ${userData.lastName}`}</h2>
          <p className="text-sm text-gray-600 dark:text-[var(--gc-muted)] text-center">{userData.headline}</p>
          <button
            className="mt-3 btn-primary"
            onClick={() => setEdit(true)}
          >
            Edit Profile
          </button>
        </motion.div>

        {/* Suggested Users */}
        <motion.div className="card p-4" variants={cardIn} initial="hidden" animate="visible">
          <h3 className="font-semibold text-lg mb-3 heading-accent">Suggested Users</h3>
          <motion.div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto hide-scrollbar" variants={listVariants} initial="hidden" animate="visible">
            {suggestedUser.length > 0 ? (
              suggestedUser.map((su, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition border border-transparent hover-lift"
                  onClick={() => handleGetProfile(su.userName)}
                  style={{ background: 'transparent' }}
                  variants={itemVariants}
                >
                  <div className="w-[45px] h-[45px] rounded-full overflow-hidden border-2"
                       style={{ borderColor: 'var(--gc-primary)' }}>
                    <img
                      src={su.profileImage || dp}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">{`${su.firstName} ${su.lastName}`}</span>
                    <span className="text-xs text-gray-600 dark:text-[var(--gc-muted)]">{su.headline}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-[var(--gc-muted)]">No suggestions</p>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Center Feed */}
      <div className="w-full lg:w-[50%] flex flex-col gap-5 mt-[90px]">
        {/* + Post Button */}
        <motion.button
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 hover-lift relative overflow-hidden font-semibold text-white border border-white/70 dark:border-transparent shadow-lg ring-2 ring-white/60 dark:ring-[var(--gc-primary)]/40 bg-gradient-to-r from-[var(--gc-accent)] to-[var(--gc-primary)]"
          onClick={() => setUploadPost(true)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* animated sheen */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" style={{ transform: 'skewX(-20deg)' }} />
          <motion.span
            className="inline-flex items-center gap-2"
            whileHover={{}}
          >
            <motion.span
              initial={{ rotate: 0 }}
              whileHover={{ rotate: 90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <FiPlus size={20} />
            </motion.span>
            Add Post
          </motion.span>
        </motion.button>

        {/* Posts */}
        {loadingFeed && postData.length === 0 && (
          <>
            {[0,1,2].map((i) => (
              <div key={i} className="card p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-[60px] h-[60px] rounded-full skeleton"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 skeleton"></div>
                    <div className="h-3 w-24 skeleton"></div>
                  </div>
                </div>
                <div className="h-3 w-full skeleton"></div>
                <div className="h-3 w-11/12 skeleton"></div>
                <div className="h-64 w-full rounded-lg skeleton"></div>
                <div className="flex gap-4">
                  <div className="h-8 w-20 rounded-full skeleton"></div>
                  <div className="h-8 w-20 rounded-full skeleton"></div>
                  <div className="h-8 w-20 rounded-full skeleton"></div>
                </div>
              </div>
            ))}
          </>
        )}

        {postData.map((post, index) => (
          <motion.div
            key={post._id || index}
            className="card p-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
          >
            <Post {...post} />
          </motion.div>
        ))}
      </div>

      {/* Right Sidebar: AI Assistant */}
      <AIChat />
      {/* Post Modal */}
      <AnimatePresence>
        {uploadPost && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUploadPost(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Modal panel */}
            <motion.div
              className="relative w-full max-w-lg card p-5 z-10 max-h-[85vh] flex flex-col pointer-events-auto"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.98, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -6 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">Create Post</h2>
                <RxCross1
                  className="cursor-pointer"
                  onClick={() => setUploadPost(false)}
                  aria-label="Close"
                />
              </div>

              {/* Scrollable content */}
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <textarea
                  className="input mt-3 resize-none h-32"
                  placeholder="What's on your mind?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {frontendImage && (
                  <motion.img
                    src={frontendImage}
                    alt="Preview"
                    className="mt-3 w-full max-h-[50vh] object-contain rounded-lg border border-gray-200 dark:border-[var(--gc-border)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </div>

              {/* Action bar pinned to bottom of modal */}
              <div className="shrink-0 flex justify-center items-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-[var(--gc-border)]">
                <BsImage
                  className="cursor-pointer"
                  style={{ color: 'var(--gc-primary)' }}
                  onClick={() => image.current.click()}
                />
                {frontendImage && (
                  <button
                    type="button"
                    className="text-sm px-2 py-1 rounded border border-gray-200 dark:border-[var(--gc-border)] hover:bg-gray-50 dark:hover:bg-[var(--gc-surface)]"
                    onClick={() => { setFrontendImage(""); setBackendImage(""); if (image.current) image.current.value = null; }}
                    aria-label="Remove selected image"
                  >
                    Remove image
                  </button>
                )}
                <input type="file" ref={image} hidden onChange={handleImage} />
                <motion.button
                  className="btn-primary"
                  onClick={handleUploadPost}
                  disabled={posting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {posting ? "Posting..." : "Post"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Home;
