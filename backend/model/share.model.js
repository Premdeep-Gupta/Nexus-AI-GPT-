import mongoose from "mongoose";

const sharedChatSchema = new mongoose.Schema({
  messages: [
    {
      role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
    },
  ],
  title: {
    type: String,
    default: "Shared Chat",
  },
  senderName: {
    type: String,
    required: true,
  },
  senderPhoto: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const SharedChat = mongoose.model("SharedChat", sharedChatSchema);
