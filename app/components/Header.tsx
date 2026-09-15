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
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

type HeaderProps = {
  toggleSidebar: () => void;
};

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, logout} = useAuth();
  const [isUserOpen, setIsUserOpen] = useState<boolean>(false);
  const capitalizeWords = (value: string) => {
    if (!value) return;
    return value
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const openUsersProfile = () => {
    setIsUserOpen((prev) => !prev);
  };
   const roles = user?.realm_access?.roles ?? [];
   const userType = roles.includes("manager")?"Manager":roles.includes("hr")?"HR":"Employee";

  return (
    <header className="w-full bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-4">
      {/* Left side: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search input (Hidden on mobile, visible on desktop) */}
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
        {/* Reports / Help links (hidden on small screens) */}
        <div className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-500">
          <a href="#" className="hover:text-slate-900">
            Reports & Analytics
          </a>
          <a href="#" className="hover:text-slate-900">
            Help
          </a>
        </div>

        {/* Vertical divider */}
        <div className="hidden sm:block h-6 w-[1px] bg-slate-200" />

        <div className="flex items-center gap-4 flex-1">
          <button>
            <MessageCircle className="w-5 h-5 text-gray-400" />
          </button>
          <button>
            <Bell className="w-5 h-5 text-gray-400" />
          </button>
          <button>
            <Calendar className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Notification Red Dot Badge */}
        <button className="relative text-slate-600 hover:text-slate-900">
          <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-slate-200" />

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-800 leading-none">
              {capitalizeWords(user?.name)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {userType}
            </p>
          </div>

          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
            <button onClick={openUsersProfile}>
              <User className="w-4 h-4" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </button>

               {isUserOpen && (
            <div
              className="
                absolute
                right-0
                top-11
                z-[100]
                w-64
                sm:w-72
                bg-white
                border
                border-slate-200
                rounded-lg
                shadow-xl
                overflow-hidden
              "
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <User className="w-5 h-5" />

                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>

                  {/* Name / Email */}
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

              {/* MENU */}
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                  <User2 className="w-4 h-4" />
                  <span>View Profile</span>
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                  <CreditCard className="w-4 h-4" />
                  <span>My Task</span>
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                  <CircleHelp className="w-4 h-4" />
                  <span>Help Center</span>
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-[#316AFF] transition-colors">
                  <CreditCard className="w-4 h-4" />
                  <span>Upgrade Plan</span>
                </button>
              </div>

              {/* LOGOUT */}
              <div className="border-t border-slate-100 py-1">
                <button onClick={()=>logout()} className="w-full flex cursor-pointer items-center gap-3 px-4 py-2 text-left text-xs text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}


          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
