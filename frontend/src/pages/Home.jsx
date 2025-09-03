import React, { useContext, useEffect, useRef, useState } from "react";
import { motion } from 'framer-motion'
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

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row p-5 gap-5 relative">
      {edit && <EditProfile />}

      {/* Left Sidebar */}
      <div className="w-full lg:w-[25%] flex flex-col gap-5 mt-[90px]">
        {/* Profile Card */}
        <div className="card p-5 flex flex-col items-center relative">
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
        </div>

        {/* Suggested Users */}
        <div className="card p-4">
          <h3 className="font-semibold text-lg mb-3 heading-accent">Suggested Users</h3>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto hide-scrollbar">
            {suggestedUser.length > 0 ? (
              suggestedUser.map((su, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition border border-transparent hover-lift"
                  onClick={() => handleGetProfile(su.userName)}
                  style={{ background: 'transparent' }}
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
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-[var(--gc-muted)]">No suggestions</p>
            )}
          </div>
        </div>
      </div>

      {/* Center Feed */}
      <div className="w-full lg:w-[50%] flex flex-col gap-5 mt-[90px]">
        {/* + Post Button */}
        <button
          className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 hover-lift"
          onClick={() => setUploadPost(true)}
        >
          <FiPlus size={20} /> Add Post
        </button>

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
      {uploadPost && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setUploadPost(false)}
          />
          <div className="fixed top-1/2 left-1/2 w-[90%] max-w-md card p-5 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">Create Post</h2>
              <RxCross1
                className="cursor-pointer"
                onClick={() => setUploadPost(false)}
              />
            </div>
            <textarea
              className="input mt-3 resize-none h-32"
              placeholder="What's on your mind?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {frontendImage && (
              <img
                src={frontendImage}
                alt="Preview"
                className="mt-3 w-full rounded-lg border border-gray-200 dark:border-[var(--gc-border)]"
              />
            )}
            <div className="flex justify-between items-center mt-4">
              <BsImage
                className="cursor-pointer"
                style={{ color: 'var(--gc-primary)' }}
                onClick={() => image.current.click()}
              />
              <input type="file" ref={image} hidden onChange={handleImage} />
              <button
                className="btn-primary"
                onClick={handleUploadPost}
                disabled={posting}
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          
          </div>
         
        </>
      )}
    </div>
  );
}

export default Home;
