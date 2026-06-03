import { ChatSession } from "../model/chatSession.model.js";

// Save current chat as a session (called when user clicks "New Chat")
export const saveSession = async (req, res) => {
  const { messages, title } = req.body;
  const userId = req.userId;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: "No messages to save" });
  }

  try {
    const sessionTitle =
      title ||
      messages.find((m) => m.role === "user")?.content?.slice(0, 40) ||
      "New Chat";

    const session = await ChatSession.create({
      userId,
      title: sessionTitle,
      messages,
    });

    return res.status(201).json({ sessionId: session._id, title: session.title });
  } catch (error) {
    console.error("Error saving session:", error);
    return res.status(500).json({ error: "Failed to save chat session" });
  }
};

// Get all sessions for logged-in user
export const getSessions = async (req, res) => {
  const userId = req.userId;

  try {
    const sessions = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id title createdAt messages")
      .lean();

    return res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// Get a single session by ID
export const getSession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.userId;

  try {
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ error: "Failed to fetch session" });
  }
};

// Delete a session by ID
export const deleteSession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.userId;

  try {
    await ChatSession.findOneAndDelete({ _id: sessionId, userId });
    return res.status(200).json({ message: "Session deleted" });
  } catch (error) {
    console.error("Error deleting session:", error);
    return res.status(500).json({ error: "Failed to delete session" });
  }
};
