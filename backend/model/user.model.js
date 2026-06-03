import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePhoto: {
    type: String,
    default: "",
  },
  plan: {
    type: String,
    enum: ["free", "pro"],
    default: "free",
  },
  tokensUsed: {
    type: Number,
    default: 0,
  },
  searchesUsed: {
    type: Number,
    default: 0,
  },
  memories: [
    {
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

export const User = mongoose.model("User", userSchema);