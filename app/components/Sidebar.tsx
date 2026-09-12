"use client";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  Briefcase,
  ListTodo,
  BarChart3,
  MessageCircle,
  Mail,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type SidebarProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const Sidebar = ({ isSidebarOpen, toggleSidebar }: SidebarProps) => {
  const [childComponents, setChildComponents] = useState<boolean>(false);
  return (
    <>
      <div
        onClick={toggleSidebar}
        className={`
          fixed inset-0 z-40
          bg-slate-900/20
          backdrop-blur-sm
          transition-all duration-300
          ${isSidebarOpen ? "visible opacity-100" : "invisible opacity-0"}
        `}
      />

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0
          z-50
          w-72
          bg-white
          shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#316AFF] flex items-center justify-center text-white font-bold">
              HC
            </div>

            <span className="text-xl font-bold text-slate-800">HRMS</span>
          </div>

          {/* Close button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {/* Dashboard */}
          <button
            onClick={() => setChildComponents((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#316AFF] text-white rounded-lg text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </div>

            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Sub menu */}
          {childComponents && (
            <div className="ml-4 py-2 space-y-1">
              <Link
                href="/"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                Dashboard
              </Link>

              <Link
                href="/employee"
                className="block px-4 py-2 text-sm text-[#316AFF]"
              >
                Employee
              </Link>

              <Link
                href="/attendance"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                Attendance
              </Link>

              <a
                href="#"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                Leave
              </a>

              <a
                href="#"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                Payroll
              </a>

              <a
                href="#"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                Recruitment
              </a>

              <a
                href="#"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                Task Management
              </a>

              <Link
                href="/announcements"
                className="block px-4 py-2 text-sm text-slate-700 hover:text-[#316AFF]"
              >
                 Announcements
              </Link>
              
              <Link
                href="/org-charts"
                className="block px-4 py-2 text-sm text-[#316AFF]"
              >
                Organization chart
              </Link>
            </div>
          )}

          {/* APPS & PAGES */}
          <div className="pt-6 pb-2 px-3">
            <p className="text-[10px] font-semibold text-[#316AFF]">
              APPS & PAGES
            </p>
          </div>

          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </a>

          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </a>

          <a
            href="#"
            className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4" />
              Email
            </div>

            <ChevronRight className="w-4 h-4" />
          </a>
        </nav>

        {/* Bottom Help */}
        <div className="absolute bottom-4 left-4 right-4">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
            <HelpCircle className="w-4 h-4 text-[#316AFF]" />
            Help and Support
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
