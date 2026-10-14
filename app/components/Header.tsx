"use client";

import {
  Menu,
  Search,
  Bell,
  Calendar,
  MessageCircle,
  User,
  User2,
  CreditCard,
  CircleHelp,
  LogOut,
  UserMinus,
  CheckCheck,
  X,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Loader shown the moment "View Profile" is clicked, while the profile code loads
const ProfileLoader = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white px-9 py-7 shadow-2xl">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#316AFF]/10">
        <Loader2 className="h-6 w-6 animate-spin text-[#316AFF]" />
      </span>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">Loading profile</p>
        <p className="mt-0.5 text-xs text-slate-400">Please wait a moment...</p>
      </div>
    </div>
  </div>
);

// Loaded on demand (and pre-loaded on hover) so the page itself stays light
const preloadProfileModal = () => import("../modals/ProfileModal");
const ProfileModal = dynamic(
  () => preloadProfileModal().then((m) => m.ProfileModal),
  { ssr: false, loading: () => <ProfileLoader /> },
);

type HeaderProps = {
  toggleSidebar: () => void;
};

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, logout, token } = useAuth();
  const [isUserOpen, setIsUserOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const previousUnreadCount = useRef<number>(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserOpen(false);
      }
    };
    if (isUserOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserOpen]);
  
  const playChimeSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (
        freq: number,
        startTime: number,
        duration: number,
        vol = 0.5,
      ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880.0, now, 0.2, 0.4); // A5
      playTone(1174.66, now + 0.08, 0.25, 0.5); // D6
      playTone(1479.98, now + 0.16, 0.5, 0.6); // F#6 (Sustained finish)
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const result = await res.json();
      const fetchedList: NotificationItem[] =
        result?.data?.notifications || result?.notifications || [];
      const fetchedUnread: number =
        result?.data?.unread_count ?? result?.unread_count ?? 0;

      // Play chime if new unread items arrive
      if (fetchedUnread > 0 && fetchedUnread > previousUnreadCount.current) {
        playChimeSound();
      }

      previousUnreadCount.current = fetchedUnread;
      setNotifications(fetchedList);
      setUnreadCount(fetchedUnread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [playChimeSound]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_id: id }),
      });

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mark_all_read: true }),
      });

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true })),
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const capitalizeWords = (value?: string) => {
    if (!value) return "";
    return value
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const roles = user?.realm_access?.roles ?? [];
  const userType = roles.includes("manager")
    ? "Manager"
    : roles.includes("hr")
      ? "HR"
      : "Employee";

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / 1000,
    );
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "leave_approved":
      case "leave_manager_approved":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "leave_rejected":
        return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case "leave_requested":
      case "leave_withdrawn":
        return <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <>
    <header className="w-full bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-4 relative z-40">
      {/* Left side: Mobile Toggle & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="text-slate-600 hover:text-slate-900 focus:outline-none lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything's"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#316AFF] transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-500">
          <a href="#" className="hover:text-slate-900">
            Reports & Analytics
          </a>
          <a href="#" className="hover:text-slate-900">
            Help
          </a>
        </div>

        <div className="hidden sm:block h-6 w-[1px] bg-slate-200" />

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <button>
            <MessageCircle className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
          </button>

          {/* Bell Icon & Notification Modal Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                setIsUserOpen(false);
              }}
              className="relative p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Flyout Modal */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() =>
                          !item.is_read && handleMarkAsRead(item.id)
                        }
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          !item.is_read
                            ? "bg-indigo-50/30 hover:bg-indigo-50/50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`text-xs ${!item.is_read ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}
                            >
                              {item.title}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatTimeAgo(item.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button>
            <Calendar className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-slate-200" />

        {/* User Avatar Menu */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-800 leading-none">
              {capitalizeWords(user?.name)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {userType}
            </p>
          </div>

          <div  ref={dropdownRef} className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
            <button
              onMouseEnter={preloadProfileModal}
              onFocus={preloadProfileModal}
              onTouchStart={preloadProfileModal}
              onClick={() => {
                setIsUserOpen((prev) => !prev);
                setIsNotifOpen(false);
              }}
            >
              <User className="w-4 h-4" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </button>

            {isUserOpen && (
              <div className="absolute right-0 top-11 z-[100] w-64 sm:w-72 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                      <User className="w-5 h-5" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {capitalizeWords(user?.name)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() =>{
                       setIsProfileOpen(true);
                       setIsUserOpen(false);
                    } }
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors cursor-pointer"
                  >
                    <User2 className="w-4 h-4" />
                    <span>View Profile</span>
                  </button>

                  <button onClick={() => setIsUserOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                    <CreditCard className="w-4 h-4" />
                    <span>My Task</span>
                  </button>

                  <button onClick={() => setIsUserOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                    <CircleHelp className="w-4 h-4" />
                    <span>Help Center</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => logout()}
                    className="w-full flex cursor-pointer items-center gap-3 px-4 py-2 text-left text-xs text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>

                {/* <div className="border-t border-slate-100 py-1">
                  <Link
                    href="/resignation"
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Resignation And Exit</span>
                  </Link>
                </div> */}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Rendered outside the dropdown so closing the menu does not unmount it */}
    {isProfileOpen && (
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    )}
    </>
  );
};

export default Header;