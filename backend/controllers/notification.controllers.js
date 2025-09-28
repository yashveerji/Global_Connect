import Notification from "../models/notification.model.js"

export const getNotifications = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
        const skip = (page - 1) * limit;
        const filter = { receiver: req.userId };
        const [items, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("relatedUser","firstName lastName profileImage userName")
                .populate("relatedPost","image description"),
            Notification.countDocuments(filter)
        ]);
        const hasMore = page * limit < total;
        return res.status(200).json({ page, limit, total, hasMore, items });
    } catch (error) {
        return res.status(500).json({ message: `get notification error ${error}` });
    }
}
export const deleteNotification=async (req,res)=>{
    try {
        let {id}=req.params
   await Notification.findOneAndDelete({
    _id:id,
    receiver:req.userId
   })
    return res.status(200).json({message:" notification deleted successfully"})
    } catch (error) {
        return res.status(500).json({message:`delete notification error ${error}`})
    }
}
export const clearAllNotification=async (req,res)=>{
    try {
   await Notification.deleteMany({
    receiver:req.userId
   })
    return res.status(200).json({message:" notification deleted successfully"})
    } catch (error) {
        return res.status(500).json({message:`delete all notification error ${error}`})
    }
}

export const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndUpdate({ _id: id, receiver: req.userId }, { $set: { read: true } });
        return res.status(200).json({ message: 'marked read' });
    } catch (error) {
        return res.status(500).json({ message: `mark read error ${error}` });
    }
}

export const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ receiver: req.userId, read: { $ne: true } }, { $set: { read: true } });
        return res.status(200).json({ message: 'all marked read' });
    } catch (error) {
        return res.status(500).json({ message: `mark all read error ${error}` });
    }
}

export const markUnread = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndUpdate({ _id: id, receiver: req.userId }, { $set: { read: false } });
        return res.status(200).json({ message: 'marked unread' });
    } catch (error) {
        return res.status(500).json({ message: `mark unread error ${error}` });
    }
}