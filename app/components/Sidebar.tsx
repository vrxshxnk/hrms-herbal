"use client";

import {
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  Briefcase,
  ListTodo,
  BarChart3,
  HelpCircle,
  X,
  Megaphone,
  Receipt,
  Network,
  Sliders,
  Mail,
  UserX,
  GraduationCap,
  FolderKanban,
  MessageSquare,
  Leaf
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

type SidebarProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const Sidebar = ({ isSidebarOpen, toggleSidebar }: SidebarProps) => {
  const { hasRole } = useAuth();
  const isHr = hasRole("hr");
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navItemClass = (href: string) => {
    const active = isActive(href);
    return `group flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
      active
        ? "bg-[#e8f5e9] text-[#1b4332] font-bold"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;
  };

  const iconClass = (href: string) => {
    const active = isActive(href);
    return `w-4 h-4 shrink-0 transition-colors ${
      active ? "text-[#1b4332]" : "text-slate-500 group-hover:text-slate-700"
    }`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={toggleSidebar}
        className={`fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-all duration-300 lg:hidden ${
          isSidebarOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header matching Target Herbal Creations */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1b4332] flex items-center justify-center text-white shadow-sm shrink-0">
              <Leaf className="w-5 h-5 text-emerald-400 fill-emerald-400/30" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Herbal
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Creations
              </span>
            </div>
          </Link>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="px-4 py-5 space-y-5 flex-1 overflow-y-auto">
          {/* 1. WORKSPACE */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Workspace
              </span>
            </div>

            <Link href="/" className={navItemClass("/")}>
              <div className="flex items-center gap-3">
                <BarChart3 className={iconClass("/")} />
                <span>Overview</span>
              </div>
              {isActive("/") && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              )}
            </Link>

            <Link href="/announcements" className={navItemClass("/announcements")}>
              <div className="flex items-center gap-3">
                <Megaphone className={iconClass("/announcements")} />
                <span>Announcements</span>
              </div>
              {isActive("/announcements") && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              )}
            </Link>

            {/* <Link href="/tasks" className={navItemClass("/tasks")}>
              <div className="flex items-center gap-3">
                <ListTodo className={iconClass("/tasks")} />
                <span>Task Management</span>
              </div>
            </Link> */}
          </div>

          {/* 2. PEOPLE */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                People
              </span>
            </div>

            <Link href="/employee" className={navItemClass("/employee")}>
              <div className="flex items-center gap-3">
                <Users className={iconClass("/employee")} />
                <span>People Directory</span>
              </div>
              {isActive("/employee") && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              )}
            </Link>

            <Link href="/org-charts" className={navItemClass("/org-charts")}>
              <div className="flex items-center gap-3">
                <Network className={iconClass("/org-charts")} />
                <span>Organization Chart</span>
              </div>
            </Link>

            <Link href="/resignation" className={navItemClass("/resignation")}>
              <div className="flex items-center gap-3">
                <UserX className={iconClass("/resignation")} />
                <span>Exit & Offboarding</span>
              </div>
            </Link>
          </div>

          {/* 3. TIME & ATTENDANCE */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Time & Attendance
              </span>
            </div>

            <Link href="/attendance" className={navItemClass("/attendance")}>
              <div className="flex items-center gap-3">
                <CalendarCheck className={iconClass("/attendance")} />
                <span>Attendance</span>
              </div>
              {isActive("/attendance") && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              )}
            </Link>

            <Link href="/leave" className={navItemClass("/leave")}>
              <div className="flex items-center gap-3">
                <CalendarDays className={iconClass("/leave")} />
                <span>Leave & Time Off</span>
              </div>
              {isActive("/leave") && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              )}
            </Link>

            {isHr && (
              <Link href="/leave/add" className={navItemClass("/leave/add")}>
                <div className="flex items-center gap-3">
                  <Sliders className={iconClass("/leave/add")} />
                  <span>Allocate Leave</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-50 text-emerald-700">
                  HR
                </span>
              </Link>
            )}
          </div>

          {/* 4. LEARNING & DEVELOPMENT */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Learning & Development
              </span>
            </div>

            <Link href="/training" className={navItemClass("/training")}>
              <div className="flex items-center gap-3">
                <GraduationCap className={iconClass("/training")} />
                <span>Training Modules</span>
              </div>
              {isActive("/training") && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              )}
            </Link>

            {isHr && (
              <Link href="/training/manage" className={navItemClass("/training/manage")}>
                <div className="flex items-center gap-3">
                  <FolderKanban className={iconClass("/training/manage")} />
                  <span>Manage Training</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-50 text-emerald-700">
                  HR
                </span>
              </Link>
            )}
          </div>

          {/* 5. FINANCE */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Finance
              </span>
            </div>

            <Link href="/salary" className={navItemClass("/salary")}>
              <div className="flex items-center gap-3">
                <Wallet className={iconClass("/salary")} />
                <span>Salary Advances</span>
              </div>
            </Link>

            <Link href="/reimbursements" className={navItemClass("/reimbursements")}>
              <div className="flex items-center gap-3">
                <Receipt className={iconClass("/reimbursements")} />
                <span>Reimbursements</span>
              </div>
            </Link>

            {isHr && (
              <Link href="/payroll" className={navItemClass("/payroll")}>
                <div className="flex items-center gap-3">
                  <Wallet className={iconClass("/payroll")} />
                  <span>Payroll</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-50 text-emerald-700">
                  HR
                </span>
              </Link>
            )}
          </div>
        </nav>

        {/* Bottom Help Section */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <Link
            href="/faq"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help Center</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;