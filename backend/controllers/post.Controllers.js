import Post from "../models/post.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import { io } from "../index.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const createPost = async (req, res) => {
    try {
        const { description } = req.body;
        let newPost;
        if (req.file) {
            // With memoryStorage, use buffer upload; helper supports both
            const image = await uploadOnCloudinary(req.file);
            newPost = await Post.create({ author: req.userId, description, image });
        } else {
            newPost = await Post.create({ author: req.userId, description });
        }

        const populated = await Post.findById(newPost._id)
            .populate("author", "firstName lastName profileImage headline userName")
            .populate("repostedFrom", "firstName lastName profileImage headline userName")
            .populate("comment.user", "firstName lastName profileImage headline")
            .populate("reactions.user", "firstName lastName profileImage userName");

        io.emit("postCreated", populated);
        return res.status(201).json(populated);
    } catch (error) {
        return res.status(500).json({ message: `create post error ${error}` });
    }
};

export const getPost = async (req, res) => {
    try {
        const pageParam = req.query.page;
        const limitParam = req.query.limit;

        if (!pageParam && !limitParam) {
            const posts = await Post.find()
                .populate("author", "firstName lastName profileImage headline userName")
                .populate("repostedFrom", "firstName lastName profileImage headline userName")
                .populate("comment.user", "firstName lastName profileImage headline")
                .populate("reactions.user", "firstName lastName profileImage userName")
                .sort({ createdAt: -1 });
            return res.status(200).json(posts);
        }

        const page = Math.max(parseInt(pageParam || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(limitParam || "10", 10), 1), 50);
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            Post.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("author", "firstName lastName profileImage headline userName")
                .populate("repostedFrom", "firstName lastName profileImage headline userName")
                .populate("comment.user", "firstName lastName profileImage headline")
                .populate("reactions.user", "firstName lastName profileImage userName"),
            Post.countDocuments()
        ]);

        const hasMore = page * limit < total;
        return res.status(200).json({ page, limit, total, hasMore, items });
    } catch (error) {
        return res.status(500).json({ message: "getPost error" });
    }
};

export const like = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;
        let { type } = req.body;
        if (!type) type = "like";

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const existing = (post.reactions || []).find(r => r.user.toString() === userId);
        if (existing && existing.type === type) {
            post.reactions = post.reactions.filter(r => r.user.toString() !== userId);
        } else {
            post.reactions = post.reactions.filter(r => r.user.toString() !== userId);
            post.reactions.push({ user: userId, type });
        }

        if (post.author.toString() !== userId) {
            await Notification.create({
                receiver: post.author,
                type: "like",
                relatedUser: userId,
                relatedPost: postId
            });
        }

        await post.save();

        io.emit("likeUpdated", { postId, reactions: post.reactions });
        return res.status(200).json(post);
    } catch (error) {
        return res.status(500).json({ message: `like error ${error}` });
    }
};

export const comment = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;
        const { content } = req.body;

        const post = await Post.findByIdAndUpdate(
            postId,
            { $push: { comment: { content, user: userId } } },
            { new: true }
        ).populate("comment.user", "firstName lastName profileImage headline");

        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.author.toString() !== userId) {
            await Notification.create({
                receiver: post.author,
                type: "comment",
                relatedUser: userId,
                relatedPost: postId
            });
        }

        // Mention notifications: find @username patterns and notify mentioned users
        try {
            const handles = Array.from(new Set((content || '').match(/@([A-Za-z0-9_\.\-]+)/g)?.map(h => h.slice(1)) || []));
            if (handles.length) {
                const users = await User.find({ userName: { $in: handles } }).select('_id');
                for (const u of users) {
                    if (u._id.toString() !== userId) {
                        await Notification.create({ receiver: u._id, type: 'mention', relatedUser: userId, relatedPost: postId });
                    }
                }
            }
        } catch {}

        io.emit("commentAdded", { postId, comm: post.comment });
        return res.status(200).json(post);
    } catch (error) {
        return res.status(500).json({ message: `comment error ${error}` });
    }
};

export const likeComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.userId;
        const post = await Post.findById(postId).select('comment author');
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const c = post.comment.id?.(commentId) || post.comment.find?.(x => x._id?.toString?.() === commentId);
        if (!c) return res.status(404).json({ message: 'Comment not found' });
        const has = (c.likes || []).some(u => u.toString() === userId);
        if (has) c.likes = c.likes.filter(u => u.toString() !== userId);
        else c.likes = [...(c.likes || []), userId];
        await post.save();
        io.emit('commentLikeUpdated', { postId, commentId, likes: c.likes });
        // Optional notify comment owner (not self)
        if (c.user?.toString?.() !== userId) {
            await Notification.create({ receiver: c.user, type: 'commentLike', relatedUser: userId, relatedPost: postId });
        }
        return res.status(200).json({ commentId, likes: c.likes });
    } catch (e) {
        return res.status(500).json({ message: 'like comment error' });
    }
};

export const replyToComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.userId;
        const { content } = req.body;
        const post = await Post.findById(postId).select('comment author');
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const c = post.comment.id?.(commentId) || post.comment.find?.(x => x._id?.toString?.() === commentId);
        if (!c) return res.status(404).json({ message: 'Comment not found' });
        c.replies = c.replies || [];
        c.replies.push({ content, user: userId, createdAt: new Date(), likes: [] });
        await post.save();
        io.emit('commentReplied', { postId, commentId, replies: c.replies });
        // Notify comment owner
        if (c.user?.toString?.() !== userId) {
            await Notification.create({ receiver: c.user, type: 'reply', relatedUser: userId, relatedPost: postId });
        }
        // Mention notifications inside reply
        try {
            const handles = Array.from(new Set((content || '').match(/@([A-Za-z0-9_\.\-]+)/g)?.map(h => h.slice(1)) || []));
            if (handles.length) {
                const users = await User.find({ userName: { $in: handles } }).select('_id');
                for (const u of users) {
                    if (u._id.toString() !== userId) {
                        await Notification.create({ receiver: u._id, type: 'mention', relatedUser: userId, relatedPost: postId });
                    }
                }
            }
        } catch {}
        return res.status(200).json({ commentId, replies: c.replies });
    } catch (e) {
        return res.status(500).json({ message: 'reply error' });
    }
};

export const likeReply = async (req, res) => {
    try {
        const { postId, commentId, replyId } = req.params;
        const userId = req.userId;
        const post = await Post.findById(postId).select('comment author');
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const c = post.comment.id?.(commentId) || post.comment.find?.(x => x._id?.toString?.() === commentId);
        if (!c) return res.status(404).json({ message: 'Comment not found' });
        const r = (c.replies || []).find(x => x._id?.toString?.() === replyId);
        if (!r) return res.status(404).json({ message: 'Reply not found' });
        const has = (r.likes || []).some(u => u.toString() === userId);
        if (has) r.likes = r.likes.filter(u => u.toString() !== userId);
        else r.likes = [...(r.likes || []), userId];
        await post.save();
        io.emit('replyLikeUpdated', { postId, commentId, replyId, likes: r.likes });
        if (r.user?.toString?.() !== userId) {
            await Notification.create({ receiver: r.user, type: 'replyLike', relatedUser: userId, relatedPost: postId });
        }
        return res.status(200).json({ replyId, likes: r.likes });
    } catch (e) {
        return res.status(500).json({ message: 'like reply error' });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });
        if (post.author.toString() !== userId) return res.status(403).json({ message: "Not authorized" });
        await post.deleteOne();
        io.emit("postDeleted", { postId });
        return res.status(200).json({ message: "Post deleted" });
    } catch (error) {
        return res.status(500).json({ message: `delete post error ${error}` });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.userId;
        // First fetch post author to allow owners to moderate
        const post = await Post.findById(postId).select("author comment._id comment.user");
        if (!post) return res.status(404).json({ message: "Post not found" });
        const isOwner = post.author?.toString?.() === userId;
        const comment = post.comment?.id?.(commentId) || post.comment?.find?.(c => c._id?.toString?.() === commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });
        if (!isOwner && comment.user?.toString?.() !== userId) {
            return res.status(403).json({ message: "Not authorized" });
        }
        await Post.updateOne({ _id: postId }, { $pull: { comment: { _id: commentId } } });
        io.emit("commentDeleted", { postId, commentId });
        return res.status(200).json({ message: "Comment deleted", commentId });
    } catch (error) {
        console.error("deleteComment error", error);
        return res.status(500).json({ message: "delete comment error" });
    }
};

export const repost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;
        const originalPost = await Post.findById(postId);
        if (!originalPost) return res.status(404).json({ message: "Original post not found" });
        const rootAuthor = originalPost.repostedFrom || originalPost.author;
        const newPost = await Post.create({
            author: userId,
            repostedFrom: rootAuthor,
            description: originalPost.description,
            image: originalPost.image || undefined
        });
        const populated = await Post.findById(newPost._id)
            .populate("author", "firstName lastName profileImage headline userName")
            .populate("repostedFrom", "firstName lastName profileImage headline userName")
            .populate("comment.user", "firstName lastName profileImage headline")
            .populate("reactions.user", "firstName lastName profileImage userName");
        io.emit("postCreated", populated);
        return res.status(201).json({ message: "Reposted successfully", post: populated });
    } catch (error) {
        return res.status(500).json({ message: `repost error ${error}` });
    }
};

export const quoteRepost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;
        const { quote } = req.body;
        const originalPost = await Post.findById(postId);
        if (!originalPost) return res.status(404).json({ message: "Original post not found" });
        const rootAuthor = originalPost.repostedFrom || originalPost.author;
        const newPost = await Post.create({
            author: userId,
            repostedFrom: rootAuthor,
            description: originalPost.description,
            image: originalPost.image || undefined,
            quote: quote || ""
        });
        const populated = await Post.findById(newPost._id)
            .populate("author", "firstName lastName profileImage headline userName")
            .populate("repostedFrom", "firstName lastName profileImage headline userName")
            .populate("comment.user", "firstName lastName profileImage headline")
            .populate("reactions.user", "firstName lastName profileImage userName");
        io.emit("postCreated", populated);
        return res.status(201).json({ message: "Reposted with quote", post: populated });
    } catch (error) {
        return res.status(500).json({ message: `quote repost error ${error}` });
    }
};

export const toggleSavePost = async (req, res) => {
    try {
        const userId = req.userId;
        const postId = req.params.id;
        const user = await User.findById(userId).select("savedPosts");
        if (!user) return res.status(404).json({ message: "User not found" });

        const exists = (user.savedPosts || []).some(p => p.toString() === postId);
        if (exists) {
            user.savedPosts = user.savedPosts.filter(p => p.toString() !== postId);
        } else {
            user.savedPosts = [...(user.savedPosts || []), postId];
        }
        await user.save();
        return res.status(200).json({ saved: !exists, savedPosts: user.savedPosts });
    } catch (error) {
        return res.status(500).json({ message: `toggle save error ${error}` });
    }
};

export const getSavedPosts = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).populate({
            path: "savedPosts",
            populate: [
                { path: "author", select: "firstName lastName profileImage headline userName" },
                { path: "repostedFrom", select: "firstName lastName profileImage headline userName" },
                { path: "comment.user", select: "firstName lastName profileImage headline" },
                { path: "reactions.user", select: "firstName lastName profileImage userName" }
            ]
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(user.savedPosts || []);
    } catch (error) {
        return res.status(500).json({ message: `get saved posts error ${error}` });
    }
};

// Paginated post search by description/quote or author name/headline/username
export const searchPosts = async (req, res) => {
    try {
        const q = (req.query.q || req.query.query || "").toString().trim();
        if (!q) return res.status(400).json({ message: "Query is required" });

        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
        const skip = (page - 1) * limit;

        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
        // Find authors matching the query to include their posts
        const authors = await User.find({
            $or: [
                { firstName: { $regex: regex } },
                { lastName: { $regex: regex } },
                { userName: { $regex: regex } },
                { headline: { $regex: regex } },
            ]
        }).select("_id");
        const authorIds = authors.map(a => a._id);

        const filter = {
            $or: [
                { description: { $regex: regex } },
                { quote: { $regex: regex } },
                ...(authorIds.length ? [{ author: { $in: authorIds } }] : [])
            ]
        };

        const [items, total] = await Promise.all([
            Post.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("author", "firstName lastName profileImage headline userName")
                .populate("repostedFrom", "firstName lastName profileImage headline userName")
                .populate("comment.user", "firstName lastName profileImage headline")
                .populate("reactions.user", "firstName lastName profileImage userName"),
            Post.countDocuments(filter)
        ]);

        const hasMore = page * limit < total;
        return res.status(200).json({ page, limit, total, hasMore, items });
    } catch (error) {
        console.error("searchPosts error", error);
        return res.status(500).json({ message: "post search error" });
    }
};
