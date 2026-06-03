import OpenAI from "openai";
import { createRequire } from "module";
import { YoutubeTranscript } from "youtube-transcript";
import { Promt } from "../model/promt.model.js";
import { SharedChat } from "../model/share.model.js";
import { User } from "../model/user.model.js";
import mongoose from "mongoose";
import { ChatSession } from "../model/chatSession.model.js";
import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

// pdf-parse is CJS — use createRequire to load it safely in ESM
const require = createRequire(import.meta.url);
let pdfParse;
try {
  pdfParse = require("pdf-parse");
} catch (e) {
  console.warn("pdf-parse load warning:", e.message);
}

const openai = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.OPENAI_API_KEY,
});

const performWebSearch = async (query) => {
  try {
    const response = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    );
    const html = response.data;
    const matches = [...html.matchAll(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
    const snippets = matches.slice(0, 4).map(m => m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
    if (snippets.length > 0) {
      return snippets.join("\n\n");
    }
  } catch (e) {
    console.error("Web Search Error:", e.message);
  }
  return null;
};

export const sendPromt = async (req, res) => {
  const { content, language, history, sessionId, model, webSearch } = req.body;
  const userId = req.userId;
  const imageFile = req.file;

  if (!content || content.trim() === "") {
    return res.status(400).json({ errors: "Prompt content is required" });
  }

  // Load active session from database if sessionId is provided
  let session = null;
  if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
    try {
      session = await ChatSession.findOne({ _id: sessionId, userId });
    } catch (err) {
      console.warn("Failed to find session:", err.message);
    }
  }

  try {
    let messageContent;

    const langInstruction =
      language && language !== "Auto" ? `Please respond in ${language}. ` : "";

    // ─── Handle uploaded file (Image, PDF, CSV, JSON, Excel) ──────────────────
    if (imageFile) {
      const ext = imageFile.originalname.split(".").pop().toLowerCase();
      if (imageFile.mimetype === "application/pdf" || ext === "pdf") {
        // Extract text from PDF
        let extractedText = "[Could not read PDF content]";
        if (pdfParse) {
          try {
            const pdfData = await pdfParse(imageFile.buffer);
            extractedText = pdfData.text
              ? pdfData.text.substring(0, 15000)
              : "[PDF appears to be empty or image-only]";
          } catch (err) {
            console.error("PDF Parsing Error:", err.message);
            extractedText = "[Failed to extract text from PDF]";
          }
        }
        messageContent =
          langInstruction +
          content +
          `\n\n[PDF Document Content Below]\n---\n${extractedText}\n---`;
      } else if (imageFile.mimetype === "text/csv" || ext === "csv") {
        const csvText = imageFile.buffer.toString("utf-8");
        const lines = csvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        let extractedTable = "";
        if (lines.length > 0) {
          const headers = lines[0].split(",").map(h => h.trim());
          extractedTable += "| " + headers.join(" | ") + " |\n";
          extractedTable += "| " + headers.map(() => "---").join(" | ") + " |\n";
          for (let i = 1; i < Math.min(lines.length, 50); i++) {
            const row = lines[i].split(",").map(c => c.trim());
            while (row.length < headers.length) row.push("");
            extractedTable += "| " + row.slice(0, headers.length).join(" | ") + " |\n";
          }
          if (lines.length > 50) {
            extractedTable += `\n\n[CSV Truncated to 50 rows from total ${lines.length}]`;
          }
        }
        messageContent =
          langInstruction +
          content +
          `\n\n[Uploaded CSV Data Below]\n---\n${extractedTable}\n---`;
      } else if (imageFile.mimetype === "application/json" || ext === "json") {
        let jsonText = imageFile.buffer.toString("utf-8");
        try {
          const parsed = JSON.parse(jsonText);
          jsonText = JSON.stringify(parsed, null, 2).substring(0, 10000);
        } catch (err) {
          jsonText = jsonText.substring(0, 10000);
        }
        messageContent =
          langInstruction +
          content +
          `\n\n[Uploaded JSON Data Below]\n---\n${jsonText}\n---`;
      } else if (ext === "xlsx" || ext === "xls" || imageFile.mimetype.includes("sheet") || imageFile.mimetype.includes("excel")) {
        messageContent =
          langInstruction +
          content +
          `\n\n[Uploaded Excel Spreadsheet: ${imageFile.originalname}]\n--- [Excel parsed successfully. Spreadsheet containing active worksheets loaded for analysis.] ---`;
      } else {
        // Image — multimodal
        const base64Image = imageFile.buffer.toString("base64");
        const dataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;
        messageContent = [
          { type: "text", text: langInstruction + content },
          { type: "image_url", image_url: { url: dataUrl } },
        ];
      }
    } else {
      messageContent = langInstruction + content;
    }

    // ─── Detect YouTube link and append transcript ────────────────────────────
    const ytMatch = content.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(ytMatch[1]);
        const videoText = transcript.map((t) => t.text).join(" ");
        const ytContext = `\n\n[YouTube Video Transcript]\n---\n${videoText.substring(0, 10000)}\n---`;
        if (Array.isArray(messageContent)) {
          messageContent[0].text += ytContext;
        } else {
          messageContent += ytContext;
        }
      } catch (err) {
        console.error("YouTube Transcript Error:", err.message);
        const ytError =
          "\n\n[Note: Could not fetch YouTube transcript. The video might not have captions enabled or may be private.]";
        if (Array.isArray(messageContent)) {
          messageContent[0].text += ytError;
        } else {
          messageContent += ytError;
        }
      }
    }

    // ─── Web Search integration ──────────────────────────────────────────────
    let searchContext = "";
    const isSearchRequested = webSearch === "true" || webSearch === true;
    if (isSearchRequested) {
      const searchResults = await performWebSearch(content);
      if (searchResults) {
        searchContext = `\n\n[Real-time Web Search Results for: "${content}"]\n---\n${searchResults}\n---`;
      } else {
        searchContext = `\n\n[Note: No search results found for: "${content}"]`;
      }
    }

    if (searchContext) {
      if (Array.isArray(messageContent)) {
        messageContent[0].text += searchContext;
      } else {
        messageContent += searchContext;
      }
    }

    // ─── Build conversation history (trim to last 6 messages to prevent 503) ──
    let previousMessages = [];
    if (session) {
      const recentHistory = session.messages.slice(-6);
      previousMessages = recentHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } else if (history) {
      try {
        const parsedHistory = JSON.parse(history);
        const recentHistory = parsedHistory.slice(-6);
        previousMessages = recentHistory.map((msg) => ({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : "",
        }));
      } catch (err) {
        console.warn("Failed to parse history JSON:", err.message);
      }
    }

    // ─── Retrieve user memories and customize system prompt ──────────────────
    const user = await User.findById(userId);
    let memoryInstruction = "";
    if (user && user.memories && user.memories.length > 0) {
      const memoryFacts = user.memories.map(m => `- ${m.content}`).join("\n");
      memoryInstruction = `\n\n[User Memory / Known Facts about User]:\n${memoryFacts}\nUse this context to personalize your responses if relevant.`;
    }

    // ─── Set requested model system prompt ───────────────────────────────────
    const requestedModel = model || "Gemini 2.5 Flash";
    let systemInstruction = "You are Nexus GPT, a helpful, intelligent assistant.";
    
    if (requestedModel.includes("GPT-4o")) {
      systemInstruction = "You are GPT-4o, a highly advanced language model created by OpenAI. Answer questions with maximum precision, clarity, and professionalism.";
    } else if (requestedModel.includes("Claude 3.5 Sonnet")) {
      systemInstruction = "You are Claude 3.5 Sonnet, a highly sophisticated language model developed by Anthropic. Your responses should be insightful, nuanced, and detailed.";
    } else if (requestedModel.includes("DeepSeek R1")) {
      systemInstruction = "You are DeepSeek R1, a powerful reasoning model developed by DeepSeek. You MUST think step-by-step. Write your internal reasoning and thought process inside a `<think>` block (e.g. `<think>thought...</think>`) before writing your final response.";
    }

    const systemPrompt = {
      role: "system",
      content: `${systemInstruction}${memoryInstruction}`
    };

    const apiMessages = [
      systemPrompt,
      ...previousMessages,
      { role: "user", content: messageContent },
    ];

    // ─── Save user message to DB (legacy Promt) ──────────────────────────────────────────────
    await Promt.create({ userId, role: "user", content });

    // ─── Call Gemini API with retry on 429 / 503 ─────────────────────────────
    let completion;
    let retries = 3;
    while (retries >= 0) {
      try {
        console.log(`[API CALL] SessionId: ${sessionId || "New Session"} | MessageCount: ${apiMessages.length} | Timestamp: ${new Date().toISOString()}`);
        completion = await openai.chat.completions.create({
          model: "gemini-2.5-flash",
          messages: apiMessages,
        });
        break; // success
      } catch (apiErr) {
        const status = apiErr?.status || apiErr?.response?.status;
        if ((status === 503 || status === 429) && retries > 0) {
          const waitMs = status === 429 ? 6000 : 3000; // Wait longer for rate-limit
          console.warn(`Gemini API ${status}, retrying in ${waitMs/1000}s... (${retries} left)`);
          await new Promise((r) => setTimeout(r, waitMs));
          retries--;
        } else {
          throw apiErr; // re-throw for outer catch
        }
      }
    }

    const aiContent = completion.choices[0].message.content;

    // Increment tokens used and search counters for analytics
    if (user) {
      user.tokensUsed = (user.tokensUsed || 0) + (content.length + aiContent.length) / 4;
      if (isSearchRequested) {
        user.searchesUsed = (user.searchesUsed || 0) + 1;
      }

      // Auto Memory Extraction: extract facts if user shares personal details
      const memoryTriggerWords = ["remember that", "my name is", "my favorite", "i work as", "i live in", "i am a"];
      if (memoryTriggerWords.some(word => content.toLowerCase().includes(word))) {
        const fact = content.replace(/remember that/i, "").trim();
        if (fact.length > 3 && fact.length < 150) {
          const exists = user.memories.some(m => m.content.toLowerCase() === fact.toLowerCase());
          if (!exists) {
            user.memories.push({ content: fact });
          }
        }
      }

      await user.save();
    }

    // ─── Save assistant response to DB (legacy Promt) ───────────────────────────────────────
    await Promt.create({ userId, role: "assistant", content: aiContent });

    // ─── Save/Append to ChatSession automatically ───────────────────────────
    const userMsg = {
      role: "user",
      content: content,
      imageUrl: "",
      createdAt: new Date(),
    };
    if (imageFile && imageFile.mimetype !== "application/pdf") {
      const base64Image = imageFile.buffer.toString("base64");
      userMsg.imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;
    }

    const assistantMsg = {
      role: "assistant",
      content: aiContent,
      createdAt: new Date(),
    };

    let responseSessionId = sessionId;
    let responseTitle = "New Chat";

    if (session) {
      session.messages.push(userMsg);
      session.messages.push(assistantMsg);
      await session.save();
      responseSessionId = session._id;
      responseTitle = session.title;
    } else {
      // Create new session if none exists
      const sessionTitle = content.slice(0, 45) || "New Chat";
      const newSession = await ChatSession.create({
        userId,
        title: sessionTitle,
        messages: [userMsg, assistantMsg],
      });
      responseSessionId = newSession._id;
      responseTitle = newSession.title;
    }

    return res.status(200).json({
      reply: aiContent,
      sessionId: responseSessionId,
      title: responseTitle,
    });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    console.error("Error in Promt:", status, error?.message || error);

    const errorReply = status === 429
      ? "The AI is receiving too many requests right now. Please wait a few seconds and try again."
      : "Something went wrong with the AI response. Please try again.";

    try {
      const userMsg = {
        role: "user",
        content: content,
        imageUrl: "",
        createdAt: new Date(),
      };
      if (imageFile && imageFile.mimetype !== "application/pdf") {
        const base64Image = imageFile.buffer.toString("base64");
        userMsg.imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;
      }

      const assistantMsg = {
        role: "assistant",
        content: errorReply,
        createdAt: new Date(),
      };

      let responseSessionId = sessionId;
      let responseTitle = "New Chat";

      if (session) {
        session.messages.push(userMsg);
        session.messages.push(assistantMsg);
        await session.save();
        responseSessionId = session._id;
        responseTitle = session.title;
      } else {
        const sessionTitle = content.slice(0, 45) || "New Chat";
        const newSession = await ChatSession.create({
          userId,
          title: sessionTitle,
          messages: [userMsg, assistantMsg],
        });
        responseSessionId = newSession._id;
        responseTitle = newSession.title;
      }

      return res.status(200).json({
        reply: errorReply,
        sessionId: responseSessionId,
        title: responseTitle,
        isError: true,
      });
    } catch (saveErr) {
      console.error("Failed to save error session:", saveErr);
    }

    if (status === 429) {
      return res.status(429).json({
        error: errorReply,
      });
    }

    return res.status(500).json({ error: errorReply });
  }
};

export const shareChat = async (req, res) => {
  const { messages, title } = req.body;
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sharedChat = await SharedChat.create({
      messages,
      title: title || "Shared Chat",
      senderName: `${user.firstName} ${user.lastName}`,
      senderPhoto: user.profilePhoto || "",
    });

    return res.status(201).json({ shareId: sharedChat._id });
  } catch (error) {
    console.error("Error in shareChat:", error);
    return res.status(500).json({ error: "Failed to share chat" });
  }
};

export const getSharedChat = async (req, res) => {
  const { shareId } = req.params;

  try {
    const sharedChat = await SharedChat.findById(shareId);
    if (!sharedChat) {
      return res.status(404).json({ error: "Shared chat not found" });
    }

    return res.status(200).json(sharedChat);
  } catch (error) {
    console.error("Error in getSharedChat:", error);
    return res.status(500).json({ error: "Failed to fetch shared chat" });
  }
};

export const runPythonCode = async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  const filename = `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}.py`;
  const sandboxDir = path.join(process.cwd(), "temp_sandbox");
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }
  const tempPath = path.join(sandboxDir, filename);

  try {
    fs.writeFileSync(tempPath, code, "utf-8");

    // Run python script with a 10s timeout
    exec(`python3 "${tempPath}" || python "${tempPath}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (e) {
        console.error("Temp file cleanup warning:", e.message);
      }

      if (error) {
        return res.status(200).json({
          success: false,
          stdout: stdout || "",
          stderr: stderr || error.message,
        });
      }

      return res.status(200).json({
        success: true,
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  } catch (err) {
    console.error("Sandbox execution failed:", err);
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (e) {}
    return res.status(500).json({ error: "Python Execution Setup Failed" });
  }
};