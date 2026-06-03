import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  LogOut,
  X,
  Settings,
  User as UserIcon,
  Camera,
  Save,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Brain,
  CreditCard,
  BarChart3,
  Globe,
  Cpu,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Sidebar({ onClose, onNewChat, onLoadSession, currentMessages, sessionRefreshTrigger, activeSessionId, clearActiveSession, loading }) {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || {}
  );
  const [, setAuthUser] = useAuth();
  const navigate = useNavigate();

  // Chat history state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Settings Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || "");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Tabbed Settings Modal State
  const [activeTab, setActiveTab] = useState("profile"); // "profile", "memory", "subscription", "analytics"
  const [userSettings, setUserSettings] = useState(null);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);

  const fetchUserSettings = useCallback(async () => {
    setSettingsLoading(true);
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        "http://localhost:4002/api/v1/user/settings",
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      if (data.user) {
        setUserSettings(data.user);
        setFirstName(data.user.firstName || "");
        setLastName(data.user.lastName || "");
        setProfilePhoto(data.user.profilePhoto || "");
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setModalError("Failed to fetch user settings.");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      fetchUserSettings();
    }
  }, [isModalOpen, fetchUserSettings]);

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    setModalLoading(true);
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:4002/api/v1/user/memories",
        { content: newMemoryText },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setUserSettings((prev) => ({ ...prev, memories: data.memories }));
      setNewMemoryText("");
    } catch (err) {
      console.error("Failed to add memory:", err);
      setModalError("Failed to add memory fact.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.delete(
        `http://localhost:4002/api/v1/user/memories/${memoryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setUserSettings((prev) => ({ ...prev, memories: data.memories }));
    } catch (err) {
      console.error("Failed to delete memory:", err);
      setModalError("Failed to delete memory fact.");
    }
  };

  const handleUpgradePlan = async () => {
    setModalLoading(true);
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:4002/api/v1/user/upgrade",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setUserSettings((prev) => ({ ...prev, plan: data.user.plan }));
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      alert("Successfully upgraded to Pro!");
    } catch (err) {
      console.error("Failed to upgrade:", err);
      setModalError("Failed to upgrade plan. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Fetch sessions on mount ────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        "http://localhost:4002/api/v1/nexusgpt/sessions",
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, sessionRefreshTrigger]);

  const isSaving = false;

  // ─── Start a new chat instantly (since sessions are saved automatically on message dispatch)
  const handleNewChat = () => {
    if (loading) return;
    if (onNewChat) onNewChat();
  };

  // ─── Load a session ─────────────────────────────────────────────────────────
  const handleLoadSession = (session) => {
    if (loading) return;
    if (onLoadSession) onLoadSession(session);
    if (onClose) onClose();
  };

  // ─── Delete a session ───────────────────────────────────────────────────────
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (loading) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:4002/api/v1/nexusgpt/sessions/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSessionId === sessionId) {
        if (clearActiveSession) clearActiveSession();
        if (onNewChat) onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:4002/api/v1/user/logout", {
        withCredentials: true,
      });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setAuthUser(null);
      navigate("/login");
    } catch (error) {
      alert(error?.response?.data?.errors || "Logout Failed");
    }
  };

  // ─── Profile Photo ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setModalError("Image must be under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setProfilePhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ─── Update Profile ─────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.put(
        "http://localhost:4002/api/v1/user/update-profile",
        { firstName, lastName, profilePhoto },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err?.response?.data?.errors || "Failed to update profile");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Group sessions by date ─────────────────────────────────────────────────
  const groupedSessions = sessions.reduce((groups, session) => {
    const sessionDateStr = session.createdAt || (session.messages && session.messages.length > 0 && session.messages[0].createdAt) || new Date().toISOString();
    const date = new Date(sessionDateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    let label;
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = "This Week";
    else label = "Older";

    if (!groups[label]) groups[label] = [];
    groups[label].push(session);
    return groups;
  }, {});

  const groupOrder = ["Today", "Yesterday", "This Week", "Older"];

  return (
    <div className="h-full flex flex-col bg-[#141416] border-r border-zinc-800/80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Nexus GPT Logo"
            className="h-7 w-7 rounded-full object-cover"
          />
          <span className="text-xl font-bold tracking-tight text-white">
            Nexus GPT
          </span>
        </div>
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-zinc-800 transition">
          <X className="w-5 h-5 text-zinc-400 hover:text-white transition" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleNewChat}
          disabled={isSaving || loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-800 disabled:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition duration-200 active:scale-[0.98]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isSaving ? "Saving..." : "New Chat"}
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <MessageSquare className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm font-medium">No chat history yet</p>
            <p className="text-zinc-600 text-xs mt-1">
              Start a conversation and click "New Chat" to save it here.
            </p>
          </div>
        ) : (
          groupOrder.map((group) => {
            if (!groupedSessions[group]) return null;
            return (
              <div key={group}>
                <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider px-2 mb-1">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {groupedSessions[group].map((session) => (
                    <div
                      key={session._id}
                      onClick={() => handleLoadSession(session)}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl transition duration-150 ${
                        activeSessionId === session._id
                          ? "bg-zinc-800 text-white"
                          : "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      } ${loading ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-zinc-600" />
                      <div className="flex flex-col flex-1 min-w-0 pr-6">
                        <span className="text-xs truncate font-medium">
                          {session.title || "Untitled Chat"}
                        </span>
                        {(session.createdAt || (session.messages && session.messages.length > 0 && session.messages[0].createdAt)) && (
                          <span className="text-[9px] text-zinc-500 mt-0.5">
                            {new Date(session.createdAt || session.messages[0].createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} • {new Date(session.createdAt || session.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteSession(e, session._id)}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 hover:text-red-400 text-zinc-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Auto-delete notice */}
      {sessions.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
          <p className="text-zinc-600 text-[10px]">
            Chats auto-delete after 20 days
          </p>
        </div>
      )}

      {/* Footer: User Profile */}
      <div className="px-3 py-3 border-t border-zinc-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 transition duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 flex items-center justify-center bg-zinc-800 flex-shrink-0">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-zinc-300 font-semibold text-sm truncate">
                {user.firstName
                  ? `${user.firstName} ${user.lastName}`
                  : "User Profile"}
              </span>
              <span className="text-zinc-500 text-[10px] truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab("profile");
              setModalError("");
              setIsModalOpen(true);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition flex-shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-1 flex items-center gap-2 text-zinc-400 hover:text-red-400 text-sm px-3 py-2 rounded-lg hover:bg-red-500/10 transition duration-200"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Edit Profile / Settings Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col md:flex-row h-[500px]">
            {/* Modal Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 z-10 text-zinc-400 hover:text-white transition animate-in fade-in duration-300"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: Tab sidebar */}
            <div className="w-full md:w-48 bg-zinc-950 border-r border-zinc-850 flex flex-row md:flex-col p-4 gap-1 md:gap-2 overflow-x-auto md:overflow-x-visible shrink-0 select-none">
              <div className="hidden md:flex items-center gap-2 mb-4 px-2">
                <Settings className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold">Settings</span>
              </div>
              {[
                { id: "profile", label: "Profile", icon: UserIcon },
                { id: "memory", label: "Memory", icon: Brain },
                { id: "subscription", label: "Subscription", icon: CreditCard },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition w-full whitespace-nowrap ${
                      isSelected
                        ? "bg-violet-600 text-white"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Tab content */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col h-full bg-zinc-900">
              {settingsLoading ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  <span className="text-zinc-500 text-xs mt-2">Loading settings...</span>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold mb-4 capitalize">{activeTab} Settings</h2>

                  {/* Profile Tab */}
                  {activeTab === "profile" && (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="relative w-20 h-20 rounded-full overflow-hidden border border-zinc-750 bg-zinc-800 flex items-center justify-center group">
                            {profilePhoto ? (
                              <img
                                src={profilePhoto}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon className="w-10 h-10 text-zinc-500" />
                            )}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-semibold">
                              <Camera className="w-4 h-4 mb-0.5" />
                              Change
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <span className="text-zinc-500 text-[10px]">Profile Picture (Max 1MB)</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-zinc-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-zinc-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                            Email Address (Fixed)
                          </label>
                          <input
                            type="text"
                            value={user.email || ""}
                            disabled
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-650 text-xs cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {modalError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-2.5 text-center mt-2">
                          {modalError}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-4 mt-auto border-t border-zinc-850">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 border border-zinc-800 rounded-xl hover:bg-zinc-850 transition text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={modalLoading}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5"
                        >
                          {modalLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Memory Tab */}
                  {activeTab === "memory" && (
                    <div className="flex flex-col h-full justify-between">
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Nexus GPT saves memories and known facts about you to personalize future responses. Below is the list of facts we have saved.
                        </p>

                        {/* Add Fact Form */}
                        <form onSubmit={handleAddMemory} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add something about yourself (e.g. 'I write Python')"
                            value={newMemoryText}
                            onChange={(e) => setNewMemoryText(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                          />
                          <button
                            type="submit"
                            disabled={modalLoading || !newMemoryText.trim()}
                            className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-850 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                          >
                            Add Fact
                          </button>
                        </form>

                        {/* Memory List */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {!userSettings?.memories || userSettings.memories.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                              No facts saved yet.
                            </div>
                          ) : (
                            userSettings.memories.map((m) => (
                              <div
                                key={m._id}
                                className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs hover:border-zinc-800 transition"
                              >
                                <span className="text-zinc-300 truncate">{m.content}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMemory(m._id)}
                                  className="text-zinc-500 hover:text-red-400 p-1 transition"
                                  title="Delete memory"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {modalError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-2.5 text-center mt-2">
                          {modalError}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-4 mt-auto border-t border-zinc-850">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 border border-zinc-800 rounded-xl hover:bg-zinc-850 transition text-xs font-semibold"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subscription Tab */}
                  {activeTab === "subscription" && (
                    <div className="flex flex-col h-full justify-between">
                      <div className="space-y-6">
                        <div className="bg-zinc-950 border border-zinc-805 p-5 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Current Status</span>
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                              {userSettings?.plan === "pro" ? (
                                <>
                                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Premium Pro Plan
                                </>
                              ) : (
                                "Standard Free Plan"
                              )}
                            </h3>
                          </div>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                            userSettings?.plan === "pro" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" : "bg-zinc-800 text-zinc-400"
                          }`}>
                            {userSettings?.plan === "pro" ? "Active" : "Free"}
                          </span>
                        </div>

                        {userSettings?.plan === "pro" ? (
                          <div className="bg-emerald-500/10 border border-emerald-550/20 text-emerald-400 rounded-2xl p-4 text-xs leading-relaxed">
                            ✓ You have full enterprise level access to multiple models (GPT-4o, Claude, DeepSeek R1), web search toggles, unlimited memories, spreadsheet analysis and voice inputs.
                          </div>
                        ) : (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <p className="text-xs text-zinc-400 leading-relaxed">
                              Upgrade to the Premium Pro plan to unlock high-priority access, multiple models (GPT-4o, Claude Sonnet), real-time Web Search, and document parsing (Excel, PDF, CSV).
                            </p>
                            <button
                              type="button"
                              onClick={handleUpgradePlan}
                              disabled={modalLoading}
                              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-600/15 transition active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                              {modalLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-amber-400" />
                              )}
                              Upgrade to Pro ($20/mo)
                            </button>
                          </div>
                        )}
                      </div>

                      {modalError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-2.5 text-center mt-2">
                          {modalError}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-4 mt-auto border-t border-zinc-850">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 border border-zinc-800 rounded-xl hover:bg-zinc-850 transition text-xs font-semibold"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Analytics Tab */}
                  {activeTab === "analytics" && (
                    <div className="flex flex-col h-full justify-between">
                      <div className="space-y-6">
                        <p className="text-xs text-zinc-400">
                          Track your API usage consumption metrics for the current billing cycle.
                        </p>

                        <div className="space-y-5">
                          {/* Tokens Meter */}
                          <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3.5 h-3.5 text-violet-400" />
                                Tokens Used
                              </span>
                              <span>{Math.round(userSettings?.tokensUsed || 0).toLocaleString()} / 500,000</span>
                            </div>
                            <div className="w-full h-3 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden p-0.5">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(((userSettings?.tokensUsed || 0) / 500000) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Web Searches Meter */}
                          <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                                Web Searches Used
                              </span>
                              <span>{userSettings?.searchesUsed || 0} / 500</span>
                            </div>
                            <div className="w-full h-3 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden p-0.5">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(((userSettings?.searchesUsed || 0) / 500) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl text-center">
                          <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider mb-1">Billing Period Reset</span>
                          <span className="text-xs text-zinc-300 font-semibold">Resets on June 30, 2026</span>
                        </div>
                      </div>

                      {modalError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-2.5 text-center mt-2">
                          {modalError}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-4 mt-auto border-t border-zinc-850">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 border border-zinc-800 rounded-xl hover:bg-zinc-850 transition text-xs font-semibold"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Sidebar;
