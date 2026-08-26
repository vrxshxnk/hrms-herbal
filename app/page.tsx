"use client";

import { useAuth } from "./context/AuthContext";
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  LayoutDashboard,
  Briefcase,
  LogOut,
  Flame
} from "lucide-react";

export default function HRMSDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-theme-dark text-white overflow-hidden relative">
      {/* Diagonal orange glow streak, like the reference */}
      <div className="absolute inset-0 bg-theme-glow pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0A0A0A]/90 backdrop-blur-md border-r border-white/5 flex flex-col justify-between p-5 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-9 h-9 bg-orange-gradient rounded-xl flex items-center justify-center font-bold text-white glow-orange">
              <Flame size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Herbal <span className="text-[#FF5E2B]">HRMS</span>
            </span>
          </div>

          <nav className="space-y-1.5">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
            <NavItem icon={<Users size={18} />} label="Employees" />
            <NavItem icon={<Calendar size={18} />} label="Attendance" />
            <NavItem icon={<Clock size={18} />} label="Leave Requests" />
            <NavItem icon={<DollarSign size={18} />} label="Payroll" />
            <NavItem icon={<Briefcase size={18} />} label="Designations" />
          </nav>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 text-white/60 font-medium hover:bg-white/5 rounded-xl transition border border-transparent hover:border-white/10"
        >
          <LogOut size={18} />
          <span className="text-sm">Logout ({user?.preferred_username || user?.name || "User"})</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto relative z-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome Back, <span className="text-fade-gradient">{user?.preferred_username || user?.name || "Admin"}</span> 👋
            </h1>
            <p className="text-white/50 text-sm mt-1">Real-Time Data, Zero Hassle. HR metrics overview for today.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-[#FF5E2B]/10 border border-[#FF5E2B]/30 text-[#FF5E2B] rounded-full text-xs font-semibold">
              System Active
            </span>
          </div>
        </header>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard title="Total Employees" value="124" badge="+3 this month" />
          <MetricCard title="Present Today" value="112" badge="90% attendance" />
          <MetricCard title="On Leave" value="8" badge="3 pending" />
          <MetricCard title="Open Positions" value="5" badge="HR active" />
        </div>

        {/* Main Content Surface */}
        <div className="bg-theme-card p-6 rounded-2xl shadow-2xl relative overflow-hidden">
          <h2 className="text-lg font-bold text-white mb-4">Quick Employee Actions</h2>
          <div className="p-12 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/40 bg-theme-surface">
            Keycloak Auth Connected. Theme Active.
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
        active
          ? "bg-orange-gradient text-white glow-orange"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function MetricCard({ title, value, badge }: { title: string; value: string; badge: string }) {
  return (
    <div className="bg-theme-card p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:border-[#FF5E2B]/40 transition group">
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{title}</span>
      <div className="my-3">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
      </div>
      <span className="inline-block w-fit px-2.5 py-1 rounded-md text-xs font-medium bg-[#FF5E2B]/10 text-[#FF5E2B] border border-[#FF5E2B]/25">
        {badge}
      </span>
    </div>
  );
}