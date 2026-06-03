import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Sparkles, MessageSquare, User as UserIcon, Loader2, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism";

function ShareView() {
  const { shareId } = useParams();
  const [sharedChat, setSharedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:4002/api/v1/nexusgpt/share/${shareId}`
        );
        setSharedChat(data);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load shared conversation.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedChat();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-2" />
        <p className="text-zinc-400 text-sm">Loading conversation...</p>
      </div>
    );
  }

  if (error || !sharedChat) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Conversation Not Found</h2>
        <p className="text-zinc-500 text-sm max-w-sm mb-6">
          This link may have expired or is invalid. Please check the URL and try again.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-850 px-4 py-3 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Nexus GPT"
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="text-lg font-bold tracking-tight text-white">Nexus GPT</span>
          <span className="hidden sm:inline bg-zinc-800 text-zinc-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider border border-zinc-700/50">
            Shared Link
          </span>
        </div>
        <Link
          to="/"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl transition shadow-md flex items-center gap-1.5"
        >
          Try Nexus GPT
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12 z-10">
        {/* Info Card */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 md:p-6 mb-8 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center flex-shrink-0">
              {sharedChat.senderPhoto ? (
                <img
                  src={sharedChat.senderPhoto}
                  alt={sharedChat.senderName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-6 h-6 text-zinc-650" />
              )}
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Shared by</p>
              <h3 className="text-zinc-200 font-bold text-base">{sharedChat.senderName}</h3>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Shared date</p>
            <p className="text-zinc-350 text-xs mt-0.5">
              {new Date(sharedChat.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Conversation Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-8">
          {sharedChat.title}
        </h1>

        {/* Messages */}
        <div className="space-y-6">
          {sharedChat.messages.map((msg, index) => (
            <div
              key={index}
              className={`w-full flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="flex gap-3 max-w-[90%] sm:max-w-[85%]">
                  <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <img
                      src="/logo.png"
                      alt="Nexus GPT"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 text-zinc-100 rounded-2xl rounded-tl-none px-4 py-3.5 text-[14px] leading-relaxed shadow-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={codeTheme}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-xl mt-2 border border-zinc-850"
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code
                              className="bg-zinc-800 px-1.5 py-0.5 rounded text-violet-400 font-mono text-[13px]"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="bg-violet-600/80 text-white rounded-2xl rounded-tr-none px-4.5 py-3 text-[14px] leading-relaxed max-w-[80%] sm:max-w-[75%] shadow-md">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-650 text-xs border-t border-zinc-900 mt-12 bg-zinc-950/20 z-10">
        <p className="flex items-center justify-center gap-1">
          Powered by <Sparkles className="w-3 h-3 text-violet-500" /> Nexus GPT.
        </p>
      </footer>
    </div>
  );
}

export default ShareView;
