import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Promt from "./Promt";
import { Menu, X, Copy, Bot } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism";

function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [canvasContent, setCanvasContent] = useState(null); // { title, language, content }

  const [loadedSession, setLoadedSession] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        const saved = localStorage.getItem(`activeSession_${user._id}`);
        return saved ? JSON.parse(saved) : null;
      }
    } catch (e) {
      console.warn("Failed to parse active session:", e);
    }
    return null;
  });

  // Shared state: current active messages (bridge between Sidebar & Promt)
  const [currentMessages, setCurrentMessages] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        const saved = localStorage.getItem(`activeSession_${user._id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.messages || [];
        }
      }
    } catch (e) {
      console.warn("Failed to parse active session messages:", e);
    }
    return [];
  });

  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

  // Sync loadedSession to localStorage with updated messages array
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        if (loadedSession) {
          const sessionToSave = { ...loadedSession, messages: currentMessages };
          localStorage.setItem(`activeSession_${user._id}`, JSON.stringify(sessionToSave));
        } else {
          localStorage.removeItem(`activeSession_${user._id}`);
        }
      }
    } catch (e) {
      console.error("Failed to sync active session:", e);
    }
  }, [loadedSession, currentMessages]);

  // Trigger sidebar refresh when a new session is created or messages change
  const triggerSessionRefresh = useCallback(() => {
    setSessionRefreshTrigger((prev) => prev + 1);
  }, []);

  // Called by Sidebar "New Chat" button
  const handleNewChat = useCallback(() => {
    if (loading) return;
    setLoadedSession(null);
    setCurrentMessages([]);
    setCanvasContent(null);
  }, [loading]);

  // Called by Sidebar when user clicks an old session
  const handleLoadSession = useCallback((session) => {
    if (loading) return;
    setLoadedSession(session);
    setCurrentMessages(session.messages || []);
    setIsSidebarOpen(false);
    setCanvasContent(null);
  }, [loading]);

  return (
    <div className="flex h-screen bg-[#1a1a1d] text-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 transition-transform duration-300 z-40
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:flex-shrink-0`}
      >
        <Sidebar
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={handleNewChat}
          onLoadSession={handleLoadSession}
          currentMessages={currentMessages}
          sessionRefreshTrigger={sessionRefreshTrigger}
          activeSessionId={loadedSession?._id}
          clearActiveSession={() => setLoadedSession(null)}
          loading={loading}
        />
      </div>

      {/* Main content split viewport */}
      <div className="flex-1 flex w-full min-w-0 overflow-hidden">
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#1a1a1d]">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Nexus GPT"
                className="w-6 h-6 rounded-full object-cover"
                id="nexus-mobile-logo"
              />
              <span className="text-lg font-bold">Nexus GPT</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              <Menu className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex items-start justify-center px-2 sm:px-6 pt-4 overflow-hidden">
            <Promt
              onNewChat={handleNewChat}
              messages={currentMessages}
              setMessages={setCurrentMessages}
              sessionTitle={loadedSession?.title}
              loadedSession={loadedSession}
              setLoadedSession={setLoadedSession}
              triggerSessionRefresh={triggerSessionRefresh}
              setCanvasContent={setCanvasContent}
              loading={loading}
              setLoading={setLoading}
            />
          </div>
        </div>

        {/* Canvas / Workspace Panel */}
        {canvasContent && (
          <div className="hidden md:flex w-[45%] border-l border-zinc-800/80 bg-[#141416] flex-col h-full shrink-0 z-10 animate-in slide-in-from-right duration-200">
            {/* Canvas Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/40">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-xs font-bold text-zinc-200 truncate">{canvasContent.title}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(canvasContent.content);
                    alert("Content copied to clipboard.");
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-lg transition"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCanvasContent(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-lg transition"
                  title="Close Canvas"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas Editor Viewer */}
            <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              <SyntaxHighlighter
                style={codeTheme}
                language={canvasContent.language}
                PreTag="div"
                className="rounded-xl border border-zinc-800/80 text-sm h-full"
                showLineNumbers
              >
                {canvasContent.content}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Home;
