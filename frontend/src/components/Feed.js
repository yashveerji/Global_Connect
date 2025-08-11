import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const Feed = () => {
  const { token } = useSelector((state) => state.user);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const topRef = useRef();

  // ✅ Fetch posts
  const fetchFeed = useCallback(async () => {
    try {
      const res = await api.get("/posts/feed", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data || []);
    } catch (err) {
      console.error("❌ Feed Fetch Error:", err);
      toast.error("Failed to load feed");
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchFeed();
  }, [fetchFeed, token]);

  // ✅ Post creation
  const handlePost = async () => {
    if (!content && !image) return toast.error("Post content or image required");
    setLoading(true);

    try {
      let imageUrl = "";
      if (image) {
        const formData = new FormData();
        formData.append("image", image);
        const res = await api.post("/upload/image", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        imageUrl = res.data.url;
      }

      await api.post(
        "/posts",
        { content, image: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("🎉 Post created!");
      setContent("");
      setImage(null);
      setPreview("");
      fetchFeed();
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Post Error:", err);
      toast.error("Error creating post");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id) => {
    try {
      await api.put(`/posts/like/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFeed();
    } catch (err) {
      toast.error("Error liking post");
    }
  };

  const handleComment = async (postId, comment) => {
    if (!comment) return;
    try {
      await api.post(`/posts/comment/${postId}`, { text: comment }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFeed();
    } catch (err) {
      toast.error("Error commenting");
    }
  };

  const handleRepost = async (postId) => {
    try {
      await api.post(`/posts/repost/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("🔁 Reposted!");
      fetchFeed();
    } catch (err) {
      toast.error("Repost failed");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  if (!token) {
    return (
      <div className="text-center mt-20 text-red-600 font-semibold">
        🔐 Please login to view the feed.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div ref={topRef} />

      {/* ➕ Create Post */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg p-4 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          rows={3}
        />
        <input
          type="file"
          onChange={handleImageChange}
          className="mt-3"
          accept="image/*"
        />
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="mt-3 max-h-64 w-full object-cover rounded-lg shadow-md"
          />
        )}
        <button
          onClick={handlePost}
          disabled={loading}
          className={`mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-transform active:scale-95 ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      {/* 📝 Posts List */}
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No posts to show.</div>
      ) : (
        posts.map((post) => (
          <div
            key={post._id}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-indigo-700 dark:text-indigo-400 text-lg">
                {post.userId?.name || "Unknown User"}
              </div>
            </div>
            <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap mb-3">{post.content}</p>
            {post.image && (
              <img
                src={post.image}
                alt="Post"
                className="rounded-lg max-h-72 w-full object-cover mb-4 shadow-sm"
              />
            )}

            <div className="flex gap-6 text-gray-600 dark:text-gray-300 text-sm mb-4">
              <button
                onClick={() => handleLike(post._id)}
                className="flex items-center gap-1 hover:text-indigo-600 transition"
              >
                👍 <span>{post.likes?.length || 0}</span>
              </button>
              <button
                onClick={() => handleRepost(post._id)}
                className="flex items-center gap-1 hover:text-indigo-600 transition"
              >
                🔁 Repost
              </button>
            </div>

            {/* 💬 Comments */}
            <CommentBox postId={post._id} handleComment={handleComment} />
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-gray-200">
              {post.comments.map((c, i) => (
                <div
                  key={i}
                  className="text-gray-700 dark:text-gray-200 text-sm border border-gray-100 dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {c.userId?.name || "User"}
                  </span>
                  : {c.text}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const CommentBox = ({ postId, handleComment }) => {
  const [text, setText] = useState("");

  return (
    <div className="flex gap-3 mt-3">
      <input
        type="text"
        className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        placeholder="Add a comment..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            handleComment(postId, text.trim());
            setText("");
          }
        }}
      />
      <button
        onClick={() => {
          if (text.trim()) {
            handleComment(postId, text.trim());
            setText("");
          }
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 py-2 shadow-md transition-transform active:scale-95"
      >
        Send
      </button>
    </div>
  );
};

export default Feed;
