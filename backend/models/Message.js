// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "" },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    // Attachment fields
    attachmentUrl: { type: String, default: "" },
    attachmentType: { type: String, enum: ["image", "file", ""], default: "" },
    attachmentName: { type: String, default: "" },
    attachmentMime: { type: String, default: "" },
    attachmentSize: { type: Number, default: 0 },
    attachmentWidth: { type: Number, default: 0 },
    attachmentHeight: { type: Number, default: 0 },
    deliveredAt: { type: Date, default: null },
    readAt:      { type: Date, default: null },
    // Message lifecycle
    editedAt:    { type: Date, default: null },
    deleted:     { type: Boolean, default: false },
    // Reactions: array of { user, emoji, createdAt }
    reactions: [
      new mongoose.Schema(
        {
          user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          emoji: { type: String, required: true },
          createdAt: { type: Date, default: Date.now }
        },
        { _id: false }
      )
    ]
  },
  { timestamps: true }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
