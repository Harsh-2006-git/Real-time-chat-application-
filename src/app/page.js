"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import {
  LogOut, Send, User, Search, Settings, MoreVertical,
  Edit2, Trash2, Smile, Check, CheckCheck, ArrowLeft,
  Users, MessageCircle, MoreHorizontal, X, Sun, Moon,
  Zap, ArrowRight, Shield, Globe, Sparkles, Phone,
  Video, Mail, Camera, Image, Paperclip, Mic, Bell,
  Calendar, Star, Home
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import dynamic from 'next/dynamic';

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">Loading emojis...</div>
});

// Real data integration
// Mock data removed


export default function ChatApp() {
  const { data: session, status } = useSession();
  const { socket, onlineUsers: socketOnlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [recentChats, setRecentChats] = useState([]);
  const [peopleYouMayKnow, setPeopleYouMayKnow] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [mobileTab, setMobileTab] = useState('chats');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [longPressMsg, setLongPressMsg] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isUserOnline = (userId) => {
    return socketOnlineUsers.includes(userId);
  };
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const attachmentMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target) &&
        !event.target.closest('.profile-trigger')) {
        setShowProfileDropdown(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target) &&
        !event.target.closest('.attachment-btn')) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users");
      setRecentChats(res.data.recentChats || []);
      setPeopleYouMayKnow(res.data.peopleYouMayKnow || []);
    } catch (err) {
      console.error("Fetch users error", err);
    }
  };

  useEffect(() => {
    if (session) fetchUsers();
  }, [session]);

  useEffect(() => {
    if (activeChat && session) {
      setMessages([]); // Clear previous messages immediately
      axios.get(`/api/messages/${activeChat._id}`).then((res) => {
        setMessages(res.data);
      });
      setIsTyping(false); // Reset typing status for new chat
    } else {
      setMessages([]);
    }
  }, [activeChat, session]);

  // Use Ref to keep track of activeChat for socket listeners without re-triggering them
  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!socket || !session) return;

    // Remove redundant register emit here as it's handled in SocketContext

    socket.on("receive_message", (msg) => {
      // Use ref to check if message belongs to current view
      const currentActive = activeChatRef.current;
      if (currentActive?._id === msg.sender || currentActive?._id === msg.recipient) {
        setMessages((prev) => {
          // Check if message already exists (optimistic vs real)
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
      fetchUsers();
    });

    socket.on("message_edited", ({ messageId, content }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, content, isEdited: true } : m));
    });

    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, content: "This message was deleted", isDeleted: true } : m));
    });

    socket.on("typing", ({ senderId }) => {
      if (activeChatRef.current?._id === senderId) setIsTyping(true);
    });

    socket.on("stop_typing", ({ senderId }) => {
      if (activeChatRef.current?._id === senderId) setIsTyping(false);
    });

    socket.on("user_status", ({ userId, status, lastSeen }) => {
      setRecentChats(prev => prev.map(u =>
        u._id === userId ? { ...u, online: status === "online", lastSeen: lastSeen || u.lastSeen } : u
      ));
      if (activeChatRef.current?._id === userId) {
        setActiveChat(prev => prev ? ({ ...prev, online: status === "online", lastSeen: lastSeen || prev.lastSeen }) : null);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_edited");
      socket.off("message_deleted");
      socket.off("typing");
      socket.off("stop_typing");
      // user_status handled in Context for global consistency
    };
  }, [socket, session]); // Removed activeChat from dependencies

  // Function to group messages by date
  const groupMessagesByDate = (msgs) => {
    if (!msgs || msgs.length === 0) return [];
    const grouped = [];
    let currentDate = null;
    let currentGroup = [];

    const sortedMessages = [...msgs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sortedMessages.forEach((msg, index) => {
      const msgDate = isToday(new Date(msg.createdAt))
        ? 'Today'
        : isYesterday(new Date(msg.createdAt))
          ? 'Yesterday'
          : format(new Date(msg.createdAt), 'MMMM d, yyyy');

      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) grouped.push({ date: currentDate, messages: currentGroup });
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }

      if (index === sortedMessages.length - 1) {
        grouped.push({ date: currentDate, messages: currentGroup });
      }
    });

    return grouped;
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);


  useEffect(() => {
    const savedTheme = localStorage.getItem('chat-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('chat-theme', newTheme);
    document.documentElement.className = newTheme;
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (socket && activeChat) {
      socket.emit("typing", { senderId: session.user.id, recipientId: activeChat._id });

      // Clear existing timeout
      if (window.typingTimeout) clearTimeout(window.typingTimeout);

      // Set new timeout to stop typing
      window.typingTimeout = setTimeout(() => {
        socket.emit("stop_typing", { senderId: session.user.id, recipientId: activeChat._id });
      }, 2000);
    }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || !activeChat) return;

    const content = input;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMsg = {
      _id: tempId,
      content,
      sender: session.user.id,
      recipient: activeChat._id,
      createdAt: new Date().toISOString(),
      isTemp: true
    };

    // 1. Optimistic Update (Show instantly in UI)
    setMessages(prev => [...prev, tempMsg]);
    setInput("");
    setShowEmojiPicker(false);

    // 2. Clear typing status immediately
    socket.emit("stop_typing", { senderId: session.user.id, recipientId: activeChat._id });
    if (window.typingTimeout) clearTimeout(window.typingTimeout);

    try {
      if (editingMessage) {
        const { data } = await axios.patch("/api/messages", { messageId: editingMessage._id, content });
        socket.emit("edit_message", { messageId: editingMessage._id, recipientId: activeChat._id, content });
        setMessages(prev => prev.map(m => m._id === data._id ? data : m));
        setEditingMessage(null);
      } else {
        // 3. Fire-and-forget socket emit for real-time speed
        // Recipient will see it almost instantly
        socket.emit("send_message", {
          ...tempMsg,
          senderId: session.user.id,
          recipientId: activeChat._id
        });

        // 4. Save to DB in background
        const { data } = await axios.post("/api/messages", { recipient: activeChat._id, content });

        // 5. Update the temporary message with the real DB record
        setMessages(prev => prev.map(m => m._id === tempId ? data : m));
      }
    } catch (err) {
      console.error("Send error", err);
      // Remove temp message if failed
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      await axios.delete("/api/messages", { data: { messageId: msgId } });
      socket.emit("delete_message", { messageId: msgId, recipientId: activeChat._id });
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, content: "This message was deleted", isDeleted: true } : m));
      setLongPressMsg(null);
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  if (status === "loading") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="mt-4 text-xl font-semibold text-white">Loading your conversations...</div>
      <div className="text-gray-400">Just a moment</div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      {/* Left Side - Branding (Desktop) */}
      <div className="hidden lg:flex lg:w-3/5 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-2xl text-center backdrop-blur-sm bg-white/5 p-12 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gray-900 p-8 rounded-full border border-white/10 shadow-2xl flex items-center justify-center">
                <Zap className="w-20 h-20 text-blue-400" fill="currentColor" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-6 tracking-tight">
            Quantum Chat
          </h1>
          <p className="text-2xl text-gray-300 font-light leading-relaxed mb-8">
            Experience communication at the speed of thought. <br />
            <span className="text-blue-400 font-medium">Secure. Instant. Limitless.</span>
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-200">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-colors">
              <Shield className="w-4 h-4 text-blue-400" /> End-to-end Encryption
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-colors">
              <Zap className="w-4 h-4 text-purple-400" /> Real-time Sync
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50"></div>
              <Zap className="w-16 h-16 text-blue-500 relative z-10" />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/80 p-8 md:p-12 rounded-3xl border border-white/20 dark:border-gray-700 shadow-2xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Welcome Back</h2>
              <p className="text-gray-500 dark:text-gray-400">Enter the quantum realm</p>
            </div>

            <div className="space-y-6">
              <button
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-2 md:gap-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 transition-all duration-300 rounded-2xl py-3 px-4 text-sm md:text-base md:py-4 md:px-6 font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform duration-300" />
                <span>Continue with Google</span>
              </button>
            </div>

            <p className="text-xs text-center text-gray-400 mt-8">
              By entering, you agree to our <a href="#" className="underline hover:text-blue-500 transition-colors">Terms</a> & <a href="#" className="underline hover:text-blue-500 transition-colors">Privacy</a>.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Developed with <span className="text-red-500 animate-pulse">❤️</span> by <span className="text-gray-900 dark:text-white font-bold">Harsh Manmode</span>
            </p>
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Quantum Chat. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Zap className="w-8 h-8 text-blue-500" />
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-sm opacity-30"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                QuantumChat
              </h1>
            </div>
          </div>

          {/* Center Section - Desktop */}


          {/* Right Section */}
          <div className="flex items-center gap-2">
            <button className="hidden md:block relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                className="profile-trigger flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="relative">
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-9 h-9 rounded-full border-2 border-blue-500"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    ref={profileDropdownRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold group-hover:scale-110 transition-transform">
                            {session.user.name[0]}
                          </div>
                          {isUserOnline(session.user.id) && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate">{session.user.name}</h3>
                          <p className="text-sm opacity-90 truncate">{session.user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs opacity-75">● Online</span>
                            <span className="text-xs opacity-60">Active now</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    {/* Footer */}
                    <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 py-2.5 rounded-lg font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Chats */}
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
          {/* Header */}
          <div className="hidden md:block p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Conversations</h2>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages or people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-gray-100 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`flex-1 flex flex-col items-center gap-1 py-3 ${mobileTab === 'chats' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setMobileTab('chats')}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Chats</span>
            </button>
            <button
              className={`flex-1 flex flex-col items-center gap-1 py-3 ${mobileTab === 'discover' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setMobileTab('discover')}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs font-medium">Discover</span>
            </button>
          </div>


          {/* Chats List */}
          <div className="flex-1 overflow-y-auto">
            {mobileTab === 'chats' ? (
              <div className="p-2">
                {recentChats
                  .filter(chat =>
                    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    chat.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((chat) => (
                    <div
                      key={chat._id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeChat?._id === chat._id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => setActiveChat(chat)}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {chat.name[0]}
                        </div>
                        {isUserOnline(chat._id) && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col min-w-0 mr-2">
                            <h3 className="font-semibold text-sm md:text-base text-gray-800 dark:text-white truncate">
                              {chat.name}
                            </h3>
                            <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">
                              {chat.email}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {format(new Date(chat.lastSeen), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full min-w-5 flex items-center justify-center">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {chat.online && (
                        <div className="relative">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}

              </div>
            ) : (
              <div className="p-4">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">People You May Know</h3>
                <div className="space-y-4">
                  {peopleYouMayKnow.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={user.image}
                            alt={user.name}
                            className="w-12 h-12 rounded-full"
                          />
                          {isUserOnline(user._id) && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm md:text-base text-gray-800 dark:text-white">{user.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveChat(user)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col items-center gap-1 bg-white/50 dark:bg-gray-800/50">
            <p className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400">
              Developed with <span className="text-red-500 animate-pulse">❤️</span> by <span className="text-gray-900 dark:text-white font-bold">Harsh Manmode</span>
            </p>
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Quantum Chat • All rights reserved
            </p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`${activeChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col ${!activeChat && 'hidden md:flex'} bg-gray-50 dark:bg-gray-900 max-w-full overflow-hidden`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                    onClick={() => setActiveChat(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={activeChat.image}
                        alt={activeChat.name}
                        className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600"
                      />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${activeChat.online ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                    </div>

                    <div>
                      <h2 className="font-bold text-xs md:text-base text-gray-800 dark:text-white truncate max-w-[150px] md:max-w-none">{activeChat.name}</h2>
                      <div className="flex items-center gap-2">
                        {isTyping ? (
                          <div className="flex items-center gap-1 text-green-500 text-sm">
                            <span>typing</span>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-100"></div>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-200"></div>
                            </div>
                          </div>
                        ) : (
                          <span className={`text-sm ${activeChat.online ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {activeChat.online ? '● Online' : `Last seen ${formatDistanceToNow(new Date(activeChat.lastSeen))} ago`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-auto hidden md:flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                      <Video className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {groupMessagesByDate(messages).map((group, gIdx) => (
                    <div key={`group-${gIdx}`}>
                      <div className="flex justify-center my-6">
                        <span className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-full">
                          {group.date}
                        </span>
                      </div>

                      {group.messages.map((msg, index) => {
                        const isMine = msg.sender === session.user.id;
                        return (
                          <div key={msg._id || `msg-${gIdx}-${index}`} className={`mb-4 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`relative group max-w-[70%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                              <div className={`rounded-2xl px-4 py-3 ${isMine
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'
                                }`}>
                                {msg.isDeleted ? (
                                  <p className="italic text-gray-500 dark:text-gray-400">This message was deleted</p>
                                ) : (
                                  <>
                                    <p className="text-sm">{msg.content}</p>
                                    <div className={`flex items-center gap-2 mt-1 text-xs ${isMine ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                      <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                      {msg.isEdited && <span className="italic">edited</span>}
                                      {isMine && <CheckCheck className="w-3 h-3" />}
                                    </div>
                                  </>
                                )}
                              </div>

                              {!msg.isDeleted && isMine && (
                                <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setInput(msg.content);
                                    }}
                                    className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(msg._id)}
                                    className="p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                  }

                  {
                    isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 md:p-4">
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-full left-0 right-0 mb-2"
                    >
                      <EmojiPicker
                        theme={theme}
                        width="100%"
                        height={350}
                        onEmojiClick={(e) => setInput(prev => prev + e.emoji)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {editingMessage && (
                  <div className="mb-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between">
                    <span className="text-sm text-blue-600 dark:text-blue-400">Editing message</span>
                    <button
                      onClick={() => {
                        setEditingMessage(null);
                        setInput('');
                      }}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={sendMessage} className="flex items-center gap-2 md:gap-3">
                  <div className="flex-1 relative min-w-0">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-2xl px-2 md:px-4 py-3">
                      <div className="relative">
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        >
                          <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>

                        <AnimatePresence>
                          {showAttachmentMenu && (
                            <motion.div
                              ref={attachmentMenuRef}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-48"
                            >
                              <button type="button" className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                                <Image className="w-4 h-4" />
                                <span>Photo</span>
                              </button>
                              <button type="button" className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                                <Camera className="w-4 h-4" />
                                <span>Camera</span>
                              </button>
                              <button type="button" className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                                <Paperclip className="w-4 h-4" />
                                <span>Document</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="flex-1 min-w-0 bg-transparent border-none outline-none px-2 md:px-3 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          <Smile className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>

                        {isRecording ? (
                          <button
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            onClick={() => setIsRecording(false)}
                          >
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="text-sm">Recording...</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                            onMouseDown={() => setIsRecording(true)}
                          >
                            <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`p-3 md:p-4 rounded-full transition-all shrink-0 ${input.trim()
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      }`}
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </button>
                </form>

                {/* Mobile Chat Footer */}
                <div className="md:hidden py-3 flex flex-col items-center gap-1 border-t border-gray-100 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Developed with <span className="text-red-500">❤️</span> by <span className="text-gray-900 dark:text-white font-bold">Harsh Manmode</span>
                  </p>
                  <p className="text-[9px] text-gray-400">
                    © {new Date().getFullYear()} Quantum Chat
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-purple-400 rounded-full animate-ping opacity-30 delay-300"></div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Select a conversation</h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
                Choose from your chats or start a new conversation
              </p>
              <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-3">
                <MessageCircle className="w-5 h-5" />
                <span>Start New Chat</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Discover */}
        <div className="hidden lg:flex flex-col w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-white">Discover People</h3>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200">
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>



          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Suggestions</h4>
            <div className="space-y-4">
              {peopleYouMayKnow.map((user) => (
                <div key={user._id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      {isUserOnline(user._id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                      )}
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-800 dark:text-white">{user.name}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveChat(user)}
                    className="w-full py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Message
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}