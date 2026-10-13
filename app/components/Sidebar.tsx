
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
  HelpCircle,
  ChevronDown,
  ChevronRight,
  X,
  Megaphone,
  Receipt,
  Network,
  Sliders,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type SidebarProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const Sidebar = ({ isSidebarOpen, toggleSidebar }: SidebarProps) => {
  const [childComponents, setChildComponents] = useState<boolean>(true);
  const { hasRole } = useAuth();
  const isHr = hasRole("hr");
  const pathname = usePathname();

  
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

 
  const navItemClass = (href: string) => {
    const active = isActive(href);
    return `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
      active
        ? "bg-[#316AFF]/10 text-[#316AFF] font-bold shadow-sm"
        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
    }`;
  };

  const iconClass = (href: string) => {
    const active = isActive(href);
    return `w-4 h-4 shrink-0 transition-colors ${
      active ? "text-[#316AFF]" : "text-slate-400 group-hover:text-slate-700"
    }`;
  };

  return (
    <>
      {/* Backdrop overlay for Mobile ONLY */}
      <div
        onClick={toggleSidebar}
        className={`
          fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-all duration-300 lg:hidden
          ${isSidebarOpen ? "visible opacity-100" : "invisible opacity-0"}
        `}
      />

      {/* SIDEBAR: Fixed on Desktop (lg:), Slide-over on Mobile */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-slate-100 shadow-xl lg:shadow-none
          flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100/80 bg-gradient-to-b from-white to-slate-50/30 shrink-0">
          <div className="flex items-center gap-3.5 group cursor-pointer">
            {/* Gradient Icon Badge */}
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#316AFF] to-[#00B4D8] flex items-center justify-center text-white font-extrabold shadow-[0_8px_20px_-6px_rgba(49,106,255,0.4)] transition-transform duration-300 group-hover:scale-105">
              <span className="text-sm tracking-wider">HC</span>
              {/* Inner Glow */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25" />
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-slate-900">
                  HRMS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#316AFF] animate-pulse" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Workspace
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          {/* Menu Section Label */}
          <div className="px-2 pb-1 pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Main Navigation
            </span>
          </div>

          {/* Accordion Header */}
          <button
            onClick={() => setChildComponents((prev) => !prev)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-[#316AFF] to-[#2554D7] text-white rounded-xl text-xs font-bold shadow-[0_4px_12px_-2px_rgba(49,106,255,0.35)] transition-all hover:shadow-[0_6px_16px_-2px_rgba(49,106,255,0.45)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-white/20">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <span>Main Dashboard</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                childComponents ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Sub menu Items */}
          {childComponents && (
            <div className="relative ml-3 pl-3 py-1 space-y-1 border-l-2 border-slate-100">
              <Link href="/" className={navItemClass("/")}>
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={iconClass("/")} />
                  <span>Dashboard</span>
                </div>
                {isActive("/") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#316AFF]" />
                )}
              </Link>

              <Link href="/employee" className={navItemClass("/employee")}>
                <div className="flex items-center gap-2.5">
                  <Users className={iconClass("/employee")} />
                  <span>Employee</span>
                </div>
              </Link>

              <Link href="/attendance" className={navItemClass("/attendance")}>
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className={iconClass("/attendance")} />
                  <span>Attendance</span>
                </div>
              </Link>

              <Link href="/leave" className={navItemClass("/leave")}>
                <div className="flex items-center gap-2.5">
                  <CalendarDays className={iconClass("/leave")} />
                  <span>Leave</span>
                </div>
              </Link>

              {isHr && (
                <Link href="/leave/add" className={navItemClass("/leave/add")}>
                  <div className="flex items-center gap-2.5">
                    <Sliders className={iconClass("/leave/add")} />
                    <span>Allocate Leave</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                    HR
                  </span>
                </Link>
              )}

              <a href="#" className={navItemClass("/payroll")}>
                <div className="flex items-center gap-2.5">
                  <Wallet className={iconClass("/payroll")} />
                  <span>Payroll</span>
                </div>
              </a>

              <a href="#" className={navItemClass("/recruitment")}>
                <div className="flex items-center gap-2.5">
                  <Briefcase className={iconClass("/recruitment")} />
                  <span>Recruitment</span>
                </div>
              </a>

              <a href="#" className={navItemClass("/tasks")}>
                <div className="flex items-center gap-2.5">
                  <ListTodo className={iconClass("/tasks")} />
                  <span>Task Management</span>
                </div>
              </a>

              <Link href="/announcements" className={navItemClass("/announcements")}>
                <div className="flex items-center gap-2.5">
                  <Megaphone className={iconClass("/announcements")} />
                  <span>Announcements</span>
                </div>
              </Link>

              <Link href="/salary" className={navItemClass("/salary")}>
                <div className="flex items-center gap-2.5">
                  <Wallet className={iconClass("/salary")} />
                  <span>Advance Salary</span>
                </div>
              </Link>

              <Link href="/reimbursements" className={navItemClass("/reimbursements")}>
                <div className="flex items-center gap-2.5">
                  <Receipt className={iconClass("/reimbursements")} />
                  <span>Reimbursements</span>
                </div>
              </Link>

              <Link href="/org-charts" className={navItemClass("/org-charts")}>
                <div className="flex items-center gap-2.5">
                  <Network className={iconClass("/org-charts")} />
                  <span>Organization Chart</span>
                </div>
              </Link>

              <Link href="/faq" className={navItemClass("/faq")}>
                <div className="flex items-center gap-2.5">
                  <HelpCircle className={iconClass("/faq")} />
                  <span>FAQ&apos;s</span>
                </div>
              </Link>
            </div>
          )}

          {/* APPS & TOOLS SECTION */}
          <div className="pt-4 pb-1 px-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Apps & Tools
            </span>
          </div>

          <a href="#" className={navItemClass("/calendar")}>
            <div className="flex items-center gap-2.5">
              <CalendarDays className={iconClass("/calendar")} />
              <span>Calendar</span>
            </div>
          </a>

          <a href="#" className={navItemClass("/email")}>
            <div className="flex items-center gap-2.5">
              <Mail className={iconClass("/email")} />
              <span>Email</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-transform group-hover:translate-x-0.5" />
          </a>
        </nav>

        {/* Fixed Footer Help Box */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <HelpCircle className="w-4 h-4 text-[#316AFF]" />
            Help and Support
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;