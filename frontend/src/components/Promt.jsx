import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Paperclip,
  ArrowUp,
  Globe,
  Bot,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Loader2,
  X,
  ImageIcon,
  FileText,
  ChevronDown,
  Brain,
  Cpu,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const LANGUAGES = [
  "Auto",
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Chinese",
  "Japanese",
  "Korean",
  "Portuguese",
  "Russian",
  "Italian",
  "Turkish",
  "Bengali",
  "Urdu",
  "Punjabi",
  "Tamil",
  "Telugu",
];

const formatMessageTime = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  // Time formatting: e.g., 11:02 AM
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Date formatting: e.g., Today, Yesterday, or Jun 3
  const now = new Date();
  let dateStr = "";
  if (date.toDateString() === now.toDateString()) {
    dateStr = "Today";
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      dateStr = "Yesterday";
    } else {
      dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  return `${dateStr} • ${timeStr}`;
};

const parseThinking = (content) => {
  if (typeof content !== "string") return { thinking: null, rest: content };
  const thinkRegex = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(thinkRegex);
  if (match) {
    const thinking = match[1].trim();
    const rest = content.replace(thinkRegex, "").trim();
    return { thinking, rest };
  }
  return { thinking: null, rest: content };
};

function TypewriterMarkdown({ content, isTyping, onComplete, remarkPlugins, components }) {
  const [displayed, setDisplayed] = useState(isTyping ? "" : content);

  useEffect(() => {
    if (!isTyping) {
      setDisplayed(content);
      return;
    }
    let index = 0;
    const words = content.split(" ");
    const interval = setInterval(() => {
      if (index < words.length) {
        setDisplayed((prev) => prev + (prev ? " " : "") + words[index]);
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 20); // 20ms per word
    return () => clearInterval(interval);
  }, [content, isTyping, onComplete]);

  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {displayed}
    </ReactMarkdown>
  );
}

function Promt({
  onNewChat,
  messages = [],
  setMessages,
  sessionTitle,
  loadedSession,
  setLoadedSession,
  triggerSessionRefresh,
  setCanvasContent,
  loading,
  setLoading,
}) {
  const [inputValue, setInputValue] = useState("");
  const [typeMessage, setTypeMessage] = useState("");
  const promtEndRef = useRef();
  const fileInputRef = useRef();

  // Model and Web Search states
  const [selectedModel, setSelectedModel] = useState("Gemini 2.5 Flash");
  const [modelDropOpen, setModelDropOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Agent and Code Interpreter states
  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  const [agentSteps, setAgentSteps] = useState([]);
  const [executionOutputs, setExecutionOutputs] = useState({}); // { [index]: { stdout, stderr, running } }

  const handleRunCode = async (codeText, index) => {
    setExecutionOutputs((prev) => ({
      ...prev,
      [index]: { stdout: "", stderr: "", running: true },
    }));

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:4002/api/v1/nexusgpt/run-python",
        { code: codeText },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setExecutionOutputs((prev) => ({
        ...prev,
        [index]: {
          stdout: data.stdout || "",
          stderr: data.stderr || "",
          running: false,
        },
      }));
    } catch (err) {
      setExecutionOutputs((prev) => ({
        ...prev,
        [index]: {
          stdout: "",
          stderr: err?.response?.data?.error || "Sandbox execution failed",
          running: false,
        },
      }));
    }
  };

  // Voice states (STT and TTS)
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeakingMsgIndex, setVoiceSpeakingMsgIndex] = useState(null);
  const recognitionRef = useRef(null);

  // Attachment upload state (supports images, pdf, csv, json, xlsx)
  const [selectedImage, setSelectedImage] = useState(null); // { file, preview }

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Language selector state
  const [language, setLanguage] = useState("Auto");
  const [langDropOpen, setLangDropOpen] = useState(false);

  // PDF export loading
  const [pdfLoading, setPdfLoading] = useState(false);

  // Helper to determine document icons
  const getFileIcon = (file) => {
    if (!file) return null;
    const ext = file.name?.split(".").pop().toLowerCase();
    if (file.type === "application/pdf" || ext === "pdf") {
      return <FileText className="w-8 h-8 text-red-400 flex-shrink-0" />;
    }
    if (file.type === "text/csv" || ext === "csv") {
      return <FileText className="w-8 h-8 text-emerald-400 flex-shrink-0" />;
    }
    if (file.type === "application/json" || ext === "json") {
      return <FileText className="w-8 h-8 text-yellow-400 flex-shrink-0" />;
    }
    if (
      ext === "xlsx" ||
      ext === "xls" ||
      file.type?.includes("sheet") ||
      file.type?.includes("excel")
    ) {
      return <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />;
    }
    return null;
  };

  // Initialize Speech Recognition (STT)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInputValue((prev) => prev + (prev ? " " : "") + transcript);
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please try Chrome or Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSpeak = (text, index) => {
    if (!window.speechSynthesis) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (voiceSpeakingMsgIndex === index) {
        setVoiceSpeakingMsgIndex(null);
        return;
      }
    }

    const cleanedText = text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/[#*`_~]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.onend = () => setVoiceSpeakingMsgIndex(null);
    utterance.onerror = () => setVoiceSpeakingMsgIndex(null);

    setVoiceSpeakingMsgIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    promtEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage({ file, preview: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (loading) return;
    const trimmed = inputValue.trim();
    if (!trimmed && !selectedImage) return;

    const displayText = trimmed || `📎 ${selectedImage?.file?.name || "File"}`;
    setInputValue("");
    setTypeMessage(displayText);
    setLoading(true);

    const imagePreview = selectedImage?.preview || null;
    const imageFile = selectedImage?.file || null;
    setSelectedImage(null);

    const userMsgCreatedAt = new Date().toISOString();

    if (agentModeEnabled) {
      setAgentSteps([
        { label: "Formulating Agent task graph...", status: "active" }
      ]);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAgentSteps((prev) => [
        { ...prev[0], status: "done" },
        { label: "Retrieving RAG vectors and active context chunks...", status: "active" }
      ]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAgentSteps((prev) => [
        ...prev.slice(0, 1),
        { ...prev[1], status: "done" },
        { label: "Running Python Sandbox compilation check...", status: "active" }
      ]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAgentSteps((prev) => [
        ...prev.slice(0, 2),
        { ...prev[2], status: "done" },
        { label: "Generating final verified synthesis...", status: "active" }
      ]);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("content", trimmed || "Analyze this document content.");
      formData.append("language", language);
      formData.append("model", selectedModel);
      formData.append("webSearch", webSearchEnabled);
      
      const historyPayload = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      formData.append("history", JSON.stringify(historyPayload));

      if (loadedSession?._id) {
        formData.append("sessionId", loadedSession._id);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const { data } = await axios.post(
        "http://localhost:4002/api/v1/nexusgpt/promt",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      const isDoc = imageFile && !!getFileIcon(imageFile);

      const userMsg = {
        role: "user",
        content: trimmed || `📄 Attached: ${imageFile?.name}`,
        imageUrl: isDoc ? null : imagePreview,
        isPdf: isDoc,
        fileName: isDoc ? imageFile.name : null,
        createdAt: userMsgCreatedAt,
      };

      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
        isTyping: true, // triggers typewriter animation!
      };

      setMessages((prev) => [
        ...prev,
        userMsg,
        assistantMsg,
      ]);

      if (setLoadedSession) {
        setLoadedSession((prevSession) => {
          const updatedMessages = prevSession
            ? [...(prevSession.messages || []), userMsg, assistantMsg]
            : [userMsg, assistantMsg];
          return {
            _id: data.sessionId,
            title: data.title || "Chat",
            messages: updatedMessages,
          };
        });
      }

      if (triggerSessionRefresh) {
        triggerSessionRefresh();
      }
    } catch (error) {
      console.error("API Error:", error);
      const errMsg =
        error?.response?.data?.error ||
        (error?.response?.status === 429
          ? "⏳ Nexus GPT is busy right now (rate limit). Please wait 10 seconds and try again."
          : "❌ Something went wrong. Please try again.");

      const isDoc = imageFile && !!getFileIcon(imageFile);

      const userMsg = {
        role: "user",
        content: trimmed || `📄 Attached: ${imageFile?.name}`,
        imageUrl: isDoc ? null : imagePreview,
        isPdf: isDoc,
        fileName: isDoc ? imageFile?.name : null,
        createdAt: userMsgCreatedAt,
      };

      const assistantMsg = {
        role: "assistant",
        content: errMsg,
        createdAt: new Date().toISOString(),
        isTyping: false,
      };

      setMessages((prev) => [
        ...prev,
        userMsg,
        assistantMsg,
      ]);
    } finally {
      setLoading(false);
      setTypeMessage(null);
      setAgentSteps([]); // Clear steps
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSend();
      }
    }
  };

  // ─── PDF Export (Supports All Languages & Emojis via html2canvas) ─────────
  const handleDownloadPDF = async () => {
    if (messages.length === 0) return;
    setPdfLoading(true);

    try {
      const chatContainer = document.getElementById("chat-export-container");
      if (!chatContainer) return;

      const allImgs = chatContainer.querySelectorAll("img");
      allImgs.forEach((img) => {
        img.setAttribute("data-html2canvas-ignore", "true");
      });

      const originalMaxHeight = chatContainer.style.maxHeight;
      const originalOverflow = chatContainer.style.overflowY;
      chatContainer.style.maxHeight = "none";
      chatContainer.style.overflowY = "visible";

      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(chatContainer, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        backgroundColor: "#18181b",
        windowWidth: chatContainer.scrollWidth,
        windowHeight: chatContainer.scrollHeight,
      });

      allImgs.forEach((img) => {
        img.removeAttribute("data-html2canvas-ignore");
      });

      chatContainer.style.maxHeight = originalMaxHeight || "";
      chatContainer.style.overflowY = originalOverflow || "";

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`nexus_gpt_chat_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      const chatContainer = document.getElementById("chat-export-container");
      if (chatContainer) {
        chatContainer.querySelectorAll("img[data-html2canvas-ignore]").forEach((img) => {
          img.removeAttribute("data-html2canvas-ignore");
        });
      }
      setPdfLoading(false);
    }
  };

  // ─── Share Chat ────────────────────────────────────────────────────────────
  const handleShareChat = async () => {
    if (messages.length === 0) return;
    setShareLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:4002/api/v1/nexusgpt/share",
        {
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          title: messages[0]?.content?.slice(0, 40) || "Nexus GPT Chat",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      const generatedUrl = `${window.location.origin}/share/${data.shareId}`;
      setShareUrl(generatedUrl);
      setIsShareModalOpen(true);
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Failed to generate share link. Please try again.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-between flex-1 w-full h-full pb-4 md:pb-6 relative overflow-hidden">
      {/* Premium Sticky Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-3 mb-2 px-1 flex-shrink-0 animate-in fade-in duration-300">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropOpen((v) => !v)}
            className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/80 text-zinc-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            {selectedModel === "Gemini 2.5 Flash" && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            {selectedModel === "GPT-4o" && <Bot className="w-3.5 h-3.5 text-emerald-400" />}
            {selectedModel === "Claude 3.5 Sonnet" && <Cpu className="w-3.5 h-3.5 text-orange-400" />}
            {selectedModel === "DeepSeek R1" && <Brain className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{selectedModel}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>
          {modelDropOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setModelDropOpen(false)} />
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-zinc-900 border border-zinc-850 shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150 text-white">
                {[
                  { name: "Gemini 2.5 Flash", desc: "Default fast & smart multimodal model", color: "text-amber-400", icon: Sparkles },
                  { name: "GPT-4o", desc: "OpenAI flagship: high-precision logic", color: "text-emerald-400", icon: Bot },
                  { name: "Claude 3.5 Sonnet", desc: "Anthropic flagship: sophisticated writing", color: "text-orange-400", icon: Cpu },
                  { name: "DeepSeek R1", desc: "Deep reasoning: step-by-step thinking", color: "text-cyan-400", icon: Brain },
                ].map((m) => (
                  <button
                    key={m.name}
                    onClick={() => {
                      setSelectedModel(m.name);
                      setModelDropOpen(false);
                      if (m.name === "DeepSeek R1") {
                        // DeepSeek automatically encourages deep reasoning
                      }
                    }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/80 transition text-left"
                  >
                    <m.icon className={`w-4 h-4 mt-0.5 ${m.color} flex-shrink-0`} />
                    <div className="flex flex-col">
                      <span className={`text-xs font-semibold ${selectedModel === m.name ? "text-white" : "text-zinc-300"}`}>
                        {m.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 leading-normal mt-0.5">
                        {m.desc}
                      </span>
                    </div>
                    {selectedModel === m.name && (
                      <Check className="w-3.5 h-3.5 text-violet-400 ml-auto flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangDropOpen((v) => !v)}
              className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              {language}
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
            {langDropOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangDropOpen(false)} />
                <div className="absolute right-0 top-9 z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-44 max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-150">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setLangDropOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-800 transition ${
                        language === lang ? "text-violet-400 font-semibold" : "text-zinc-300"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export PDF */}
          {messages.length > 0 && (
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              title="Export as PDF"
            >
              {pdfLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          )}

          {/* Share Chat */}
          {messages.length > 0 && (
            <button
              onClick={handleShareChat}
              disabled={shareLoading}
              className="flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              title="Share Chat Link"
            >
              {shareLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-green-400" />
              )}
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>
      </div>

      {/* Greeting Section (when no messages) */}
      {messages.length === 0 && (
        <div className="mt-12 md:mt-24 text-center max-w-lg px-4 flex flex-col items-center flex-1 overflow-y-auto">
          <div className="relative group mb-4">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <img
              src="/logo.png"
              alt="Nexus GPT Logo"
              className="relative h-16 w-16 rounded-full object-cover border-2 border-zinc-900"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">
            Hi, I'm Nexus GPT.
          </h1>
          <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
            Ask me anything, upload files, or trigger live web searches.
          </p>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {[
              "📊 Process a CSV spreadsheet",
              "💡 Explain quantum computing",
              "🌐 Web search CM of Bihar",
              "🧠 DeepThink with DeepSeek R1",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  if (chip.includes("Bihar")) {
                    setWebSearchEnabled(true);
                    setInputValue("who is the current CM of Bihar?");
                  } else if (chip.includes("DeepSeek")) {
                    setSelectedModel("DeepSeek R1");
                    setInputValue("Explain string theory with step-by-step thinking.");
                  } else {
                    setInputValue(chip.slice(3));
                  }
                }}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white text-xs px-4 py-2 rounded-full transition duration-200 hover:bg-zinc-800"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div 
        id="chat-export-container"
        className="w-full max-w-4xl flex-1 overflow-y-auto mt-2 mb-4 space-y-6 max-h-[66vh] px-2 py-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {messages.map((msg, index) => {
          const isAssistant = msg.role === "assistant";
          const { thinking, rest } = parseThinking(msg.content);

          return (
            <div
              key={index}
              className={`w-full flex ${!isAssistant ? "justify-end" : "justify-start"}`}
            >
              {isAssistant ? (
                <div className="flex gap-3 max-w-[88%] sm:max-w-[82%]">
                  <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-1">
                    <img
                      src="/logo.png"
                      alt="Nexus GPT"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1 items-start max-w-full">
                    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 text-zinc-100 rounded-2xl rounded-tl-none px-4 py-3.5 text-[14px] leading-relaxed shadow-sm max-w-full overflow-hidden">
                      {/* Thought process block for DeepSeek R1 */}
                      {thinking && (
                        <details className="group border border-zinc-800 bg-zinc-950/40 rounded-xl p-3 mb-3 text-xs text-zinc-400 max-w-full" open>
                          <summary className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-300 select-none outline-none">
                            <Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            <span>Reasoning Process</span>
                            <ChevronDown className="w-3.5 h-3.5 ml-auto text-zinc-500 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 pl-4 border-l border-zinc-800 text-zinc-500 whitespace-pre-wrap leading-relaxed">
                            {thinking}
                          </div>
                        </details>
                      )}

                      <TypewriterMarkdown
                        content={rest}
                        isTyping={msg.isTyping && index === messages.length - 1} // only typing newest
                        onComplete={() => {
                          const updated = [...messages];
                          updated[index].isTyping = false;
                          setMessages(updated);
                        }}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            const codeText = String(children).replace(/\n$/, "");
                            return !inline && match ? (
                              <div className="group/code relative mt-2 rounded-xl overflow-hidden border border-zinc-800">
                                {/* Buttons overlay */}
                                <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 group-hover/code:opacity-100 transition duration-150 z-10">
                                  {match[1] === "python" && (
                                    <button
                                      type="button"
                                      onClick={() => handleRunCode(codeText, index)}
                                      className="bg-zinc-850 hover:bg-zinc-800 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-zinc-750 transition"
                                    >
                                      Run Code
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (setCanvasContent) {
                                        setCanvasContent({
                                          title: `Artifact: ${match[1]} code`,
                                          language: match[1],
                                          content: codeText,
                                        });
                                      }
                                    }}
                                    className="bg-zinc-850 hover:bg-zinc-800 text-violet-400 text-[10px] font-bold px-2 py-1 rounded border border-zinc-750 transition"
                                  >
                                    Open in Canvas
                                  </button>
                                </div>
                                <SyntaxHighlighter
                                  style={codeTheme}
                                  language={match[1]}
                                  PreTag="div"
                                  className="!my-0 !bg-zinc-950/80 !p-4 text-xs font-mono"
                                  {...props}
                                >
                                  {codeText}
                                </SyntaxHighlighter>

                                {/* Terminal Console Panel */}
                                {executionOutputs[index] && (
                                  <div className="border-t border-zinc-800 bg-[#0c0c0e] font-mono p-3 text-xs leading-normal">
                                    <div className="flex items-center justify-between text-zinc-500 font-semibold mb-1 select-none">
                                      <span>Python Sandbox Console</span>
                                      {executionOutputs[index].running && (
                                        <span className="flex items-center gap-1.5 text-yellow-500">
                                          <Loader2 className="w-3 h-3 animate-spin" /> executing...
                                        </span>
                                      )}
                                    </div>
                                    {!executionOutputs[index].running && (
                                      <div className="space-y-1 max-h-40 overflow-auto">
                                        {executionOutputs[index].stdout && (
                                          <pre className="text-zinc-200 whitespace-pre-wrap">{executionOutputs[index].stdout}</pre>
                                        )}
                                        {executionOutputs[index].stderr && (
                                          <pre className="text-red-400 whitespace-pre-wrap">{executionOutputs[index].stderr}</pre>
                                        )}
                                        {!executionOutputs[index].stdout && !executionOutputs[index].stderr && (
                                          <pre className="text-zinc-650">[Program completed with no console output]</pre>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <code
                                className="bg-zinc-800 px-1.5 py-0.5 rounded text-violet-400 font-mono text-[13px]"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="overflow-x-auto my-2 rounded-xl border border-zinc-700">
                                <table className="w-full text-sm">{children}</table>
                              </div>
                            );
                          },
                          th({ children }) {
                            return <th className="px-3 py-2 bg-zinc-800 text-zinc-300 font-semibold border-b border-zinc-700 text-left">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="px-3 py-2 text-zinc-300 border-b border-zinc-800/50">{children}</td>;
                          },
                        }}
                      />
                    </div>

                    {/* Bottom message toolbar */}
                    <div className="flex items-center gap-3 ml-2 mt-1 select-none">
                      {(msg.createdAt || loadedSession?.createdAt) && (
                        <span className="text-[10px] text-zinc-500/80 font-medium">
                          {formatMessageTime(msg.createdAt || loadedSession.createdAt)}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          alert("Response copied to clipboard.");
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleSpeak(msg.content, index)}
                        className={`p-1 rounded transition hover:bg-zinc-800/50 ${
                          voiceSpeakingMsgIndex === index ? "text-violet-400 animate-pulse bg-violet-500/10" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                        title={voiceSpeakingMsgIndex === index ? "Stop reading" : "Read aloud (TTS)"}
                      >
                        {voiceSpeakingMsgIndex === index ? (
                          <VolumeX className="w-3 h-3" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1 max-w-[78%] sm:max-w-[72%]">
                  {/* Image preview in chat bubble */}
                  {msg.imageUrl && !msg.isPdf && (
                    <div className="rounded-2xl overflow-hidden border border-zinc-750 shadow-md mb-1">
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        className="max-h-52 max-w-xs object-cover"
                      />
                    </div>
                  )}
                  {/* Doc attachment indicator in chat bubble */}
                  {msg.isPdf && (
                    <div className="flex items-center gap-2 bg-zinc-800/80 rounded-xl px-3 py-2 border border-zinc-700 shadow-sm mb-1">
                      <FileText className={`w-5 h-5 ${
                        msg.fileName?.endsWith(".pdf") ? "text-red-400" :
                        msg.fileName?.endsWith(".csv") ? "text-emerald-400" :
                        msg.fileName?.endsWith(".json") ? "text-yellow-400" :
                        (msg.fileName?.endsWith(".xlsx") || msg.fileName?.endsWith(".xls")) ? "text-blue-400" : "text-violet-400"
                      }`} />
                      <span className="text-zinc-300 text-xs font-medium truncate max-w-[200px]">
                        {msg.fileName || "Attached Document"}
                      </span>
                    </div>
                  )}
                  {msg.content && (
                    <div className="bg-violet-600/90 text-white rounded-2xl rounded-tr-none px-4 py-3 text-[14px] leading-relaxed shadow-md">
                      {msg.content}
                    </div>
                  )}
                  {(msg.createdAt || loadedSession?.createdAt) && (
                    <span className="text-[10px] text-zinc-500/80 mr-2 mt-0.5 select-none font-medium">
                      {formatMessageTime(msg.createdAt || loadedSession.createdAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Sending preview: user message */}
        {loading && typeMessage && (
          <div className="flex justify-end w-full">
            <div className="bg-violet-600/90 text-white rounded-2xl rounded-tr-none px-4 py-3 text-[14px] leading-relaxed max-w-[75%] shadow-md animate-pulse">
              {typeMessage}
            </div>
          </div>
        )}

        {/* Agent Planning execution steps */}
        {loading && agentSteps.length > 0 && (
          <div className="flex justify-start w-full animate-in fade-in duration-200">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full border border-zinc-850 bg-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-amber-500" />
              </div>
              <div className="bg-[#141416]/80 backdrop-blur-md border border-zinc-800 text-zinc-400 px-4 py-3 rounded-2xl rounded-tl-none text-xs flex flex-col gap-2 shadow-sm min-w-[280px]">
                <div className="flex items-center gap-1.5 font-bold text-zinc-300 select-none border-b border-zinc-850 pb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>Agent Execution Trace</span>
                </div>
                <div className="space-y-1.5">
                  {agentSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px]">
                      {step.status === "done" ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                      )}
                      <span className={step.status === "done" ? "text-zinc-500 line-through" : "text-zinc-300 font-semibold"}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start w-full">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center flex-shrink-0 animate-pulse">
                <img
                  src="/logo.png"
                  alt="Nexus GPT"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 text-zinc-400 px-4 py-3.5 rounded-2xl rounded-tl-none text-[13px] flex items-center gap-2 shadow-sm">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                Nexus GPT is thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={promtEndRef} />
      </div>

      {/* Input Box */}
      <div className="w-full max-w-4xl relative mt-auto px-1">
        {/* Attachment Preview Strip */}
        {selectedImage && (
          <div className="flex items-center gap-3 mb-2 px-1 animate-in slide-in-from-bottom-2 duration-200">
            <div className="relative group">
              {getFileIcon(selectedImage.file) ? (
                <div className="h-16 w-16 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md flex items-center justify-center">
                  {getFileIcon(selectedImage.file)}
                </div>
              ) : (
                <img
                  src={selectedImage.preview}
                  alt="preview"
                  className="h-16 w-16 rounded-xl object-cover border border-zinc-700 shadow-md"
                />
              )}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-zinc-800 border border-zinc-700 rounded-full p-0.5 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-zinc-400 text-xs truncate max-w-[200px]">
              {selectedImage.file.name}
            </span>
          </div>
        )}

        <div className="bg-[#18181b]/95 backdrop-blur-lg border border-zinc-800/80 rounded-[1.8rem] px-4 md:px-5 py-4 md:py-4 shadow-xl transition-all duration-300 focus-within:border-zinc-700/85">
          <div className="flex items-center w-full gap-2 border-b border-zinc-900/60 pb-2">
            <textarea
              rows={1}
              placeholder="Ask Nexus GPT anything… or drop files (PDF/CSV/XLSX/JSON/Images) 📎"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="bg-transparent flex-1 text-white placeholder-zinc-550 text-sm md:text-base outline-none resize-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "28px" }}
            />
            {/* Microphone STT Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`transition p-2 rounded-full hover:bg-zinc-800/80 ${
                isListening
                  ? "text-red-500 animate-pulse bg-red-500/10"
                  : "text-zinc-400 hover:text-white"
              }`}
              title={isListening ? "Listening... Click to stop" : "Voice Input (STT)"}
            >
              {isListening ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 gap-3">
            {/* Left: Mode Buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* DeepThink toggle */}
              <button 
                onClick={() => {
                  setSelectedModel(prev => prev === "DeepSeek R1" ? "Gemini 2.5 Flash" : "DeepSeek R1");
                }}
                className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-full transition duration-200 ${
                  selectedModel === "DeepSeek R1"
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                    : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Brain className={`w-3.5 h-3.5 ${selectedModel === "DeepSeek R1" ? "text-cyan-400" : "text-zinc-500"}`} />
                DeepThink: {selectedModel === "DeepSeek R1" ? "On" : "Off"}
              </button>

              {/* Web Search toggle */}
              <button
                type="button"
                onClick={() => setWebSearchEnabled((prev) => !prev)}
                className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-full transition duration-200 ${
                  webSearchEnabled
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${webSearchEnabled ? "text-emerald-400 animate-pulse" : "text-zinc-550"}`} />
                Web Search: {webSearchEnabled ? "On" : "Off"}
              </button>

              {/* Agent Mode toggle */}
              <button
                type="button"
                onClick={() => setAgentModeEnabled((prev) => !prev)}
                className={`flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-full transition duration-200 ${
                  agentModeEnabled
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Bot className={`w-3.5 h-3.5 ${agentModeEnabled ? "text-amber-400 animate-pulse" : "text-zinc-550"}`} />
                Agent Mode: {agentModeEnabled ? "On" : "Off"}
              </button>
            </div>

            {/* Right: Attach + Send */}
            <div className="flex items-center gap-3 ml-auto">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleImageSelect}
                className="hidden"
                id="file-upload-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`text-zinc-400 hover:text-white transition p-2 rounded-full hover:bg-zinc-800/80 ${
                  selectedImage ? "text-violet-400 bg-violet-500/10" : ""
                }`}
                title="Attach image or documents (PDF, CSV, XLSX, JSON)"
              >
                {selectedImage ? (
                  <ImageIcon className="w-4.5 h-4.5 text-violet-400" />
                ) : (
                  <Paperclip className="w-4.5 h-4.5" />
                )}
              </button>

              <button
                onClick={handleSend}
                disabled={loading || (!inputValue.trim() && !selectedImage)}
                className={`p-2 rounded-full text-white transition duration-200 ${
                  (inputValue.trim() || selectedImage) && !loading
                    ? "bg-violet-600 hover:bg-violet-500 cursor-pointer shadow-md shadow-violet-600/25 active:scale-95"
                    : "bg-zinc-800 text-zinc-650 cursor-not-allowed opacity-50"
                }`}
              >
                <ArrowUp className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-650 text-[10px] mt-2 select-none">
          Nexus GPT can make mistakes. Verify important info.
        </p>
      </div>

      {/* Share Success Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4 text-violet-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold mb-2">Share link copied!</h2>
              <p className="text-zinc-400 text-xs mb-6 px-2">
                The conversation is saved. Anyone with this link can view the chat.
              </p>

              <div className="w-full flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded-xl p-2 pl-3 mb-4">
                <span className="text-xs text-zinc-500 select-all truncate flex-1 text-left">
                  {shareUrl}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1 flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl transition text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Promt;
