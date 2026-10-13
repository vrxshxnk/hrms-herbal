"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Calendar,
  Briefcase,
  Clock,
  Plus,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight,
  Wallet,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { AddEmployeeModal } from "../modals/AddEmployeeModal";
import { TempPasswordModal } from "../modals/TempPasswordModal";

interface DashboardStats {
  totalEmployees: number;
  newEmployees: number;
  onLeave: number;
  pendingLeaves: number;
  pendingReimbursements: number;
}

interface DashboardCharts {
  hiringTrend?: { label: string; value: number }[];
  departments?: { name: string; count: number }[];
}

function getGreetingDetails() {
  const h = new Date().getHours();
  if (h < 12)
    return { text: "Good morning", icon: Sunrise, color: "text-amber-500" };
  if (h < 17)
    return { text: "Good afternoon", icon: Sun, color: "text-orange-500" };
  return { text: "Good evening", icon: Moon, color: "text-indigo-400" };
}

interface Segment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({
  segments,
  centerValue,
  centerLabel,
  loading,
}: {
  segments: Segment[];
  centerValue: React.ReactNode;
  centerLabel: string;
  loading: boolean;
}) {
  const r = 52;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="14"
          />
          {!loading &&
            total > 0 &&
            segments.map((seg) => {
              const len = (seg.value / total) * C;
              const el = (
                <circle
                  key={seg.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`}
                  strokeDashoffset={-acc}
                  style={{ transition: "stroke-dasharray 0.8s ease" }}
                />
              );
              acc += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">
            {loading ? "…" : centerValue}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {segments.map((seg) => (
          <li
            key={seg.label}
            className="flex items-center justify-between text-xs"
          >
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: seg.color }}
              />
              {seg.label}
            </span>
            <span className="font-bold text-slate-800">
              {loading ? "…" : seg.value}
              {!loading && total > 0 && (
                <span className="ml-1 font-medium text-slate-400">
                  ({Math.round((seg.value / total) * 100)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarList({
  items,
  loading,
}: {
  items: { label: string; value: number; color: string }[];
  loading: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{item.label}</span>
            <span className="font-bold text-slate-800">
              {loading ? "…" : item.value}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: loading ? "0%" : `${(item.value / max) * 100}%`,
                background: item.color,
                transition: "width 0.9s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 480;
  const H = 180;
  const padX = 12;
  const padTop = 16;
  const padBottom = 28;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (W - padX * 2) / (data.length - 1);

  const pts = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padTop + (1 - d.value / max) * (H - padTop - padBottom),
  }));

  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  const baseY = H - padBottom;
  const area = `${line} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full">
      <defs>
        <linearGradient id="hiringFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#316AFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#316AFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#hiringFill)" />
      <path
        d={line}
        fill="none"
        stroke="#316AFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#fff"
            stroke="#316AFF"
            strokeWidth="2"
          >
            <title>{`${data[i].label}: ${data[i].value}`}</title>
          </circle>
          <text
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#94A3B8"
          >
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ChartCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      <div className="mb-5">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { token, roles, user } = useAuth();
  const userName = user?.name || user?.given_name || "User";
  const hasHrRole =
    roles.includes("hr") ||
    roles.includes("hr_admin") ||
    roles.includes("admin");
  const hasManagerRole =
    roles.includes("manager") || roles.includes("super_manager") || hasHrRole;

  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    newEmployees: 0,
    onLeave: 0,
    pendingLeaves: 0,
    pendingReimbursements: 0,
  });
  const [charts, setCharts] = useState<DashboardCharts>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const result = await res.json();
      if (result?.data?.stats) {
        setStats(result.data.stats);
      } else if (result?.stats) {
        setStats(result.stats);
      }
      const c = result?.data?.charts ?? result?.charts;
      if (c) setCharts(c);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchStats();
  }, [token, fetchStats]);

  const handleModalSuccess = async (createdData?: any) => {
    await fetchStats();
    if (createdData?.temporary_password) {
      setCreatedCredentials(createdData);
      setIsPasswordModalOpen(true);
    }
  };

  const statCards = hasHrRole
    ? [
        {
          title: "Total Employees",
          value: stats.totalEmployees,
          note: "Active roster",
          icon: Users,
          color: "#FF8400",
          tint: "bg-[#FFF3E6]",
        },
        {
          title: "New Hires (30d)",
          value: stats.newEmployees,
          note: "Recent joins",
          icon: UserPlus,
          color: "#00B4D8",
          tint: "bg-[#E6F8FC]",
        },
        {
          title: "On Leave Today",
          value: stats.onLeave,
          note: "Approved leaves",
          icon: Calendar,
          color: "#F5A400",
          tint: "bg-[#FFF8E1]",
        },
        {
          title: "Pending Leaves",
          value: stats.pendingLeaves,
          note: "Requires action",
          icon: Briefcase,
          color: "#00A86B",
          tint: "bg-[#E8F7F0]",
        },
        {
          title: "Pending Reimbursements",
          value: stats.pendingReimbursements,
          note: "Expense claims",
          icon: Clock,
          color: "#FF3B30",
          tint: "bg-[#FFECEB]",
        },
      ]
    : [];

  const modules = [
    {
      href: "/leave",
      title: "Leaves",
      desc: "Manage & apply requests",
      icon: Calendar,
      iconStyle: "bg-indigo-50 text-indigo-600",
    },
    {
      href: "/reimbursements",
      title: "Reimbursements",
      desc: "Expense claims",
      icon: FileText,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/salary",
      title: "Advance Salary",
      desc: "Payroll advances",
      icon: Wallet,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      href: "/resignation",
      title: "Exit & Offboarding",
      desc: "Resignations",
      icon: LogOut,
      iconStyle: "bg-rose-50 text-rose-600",
    },
  ];

  const attention = [
    {
      label: "Leave requests awaiting approval",
      count: stats.pendingLeaves,
      href: "/leave",
      dot: "bg-emerald-500",
    },
    {
      label: "Reimbursement claims to review",
      count: stats.pendingReimbursements,
      href: "/reimbursements",
      dot: "bg-rose-500",
    },
  ];

  const workforceSegments: Segment[] = [
    {
      label: "Working",
      value: Math.max(stats.totalEmployees - stats.onLeave, 0),
      color: "#316AFF",
    },
    { label: "On leave", value: stats.onLeave, color: "#FFB703" },
  ];

  const pendingSegments: Segment[] = [
    { label: "Leave approvals", value: stats.pendingLeaves, color: "#00A86B" },
    {
      label: "Reimbursements",
      value: stats.pendingReimbursements,
      color: "#FF3B30",
    },
  ];

  const overviewBars = statCards.map((s) => ({
    label: s.title,
    value: s.value,
    color: s.color,
  }));

  const deptColors = [
    "#316AFF",
    "#00B4D8",
    "#FF8400",
    "#00A86B",
    "#8B5CF6",
    "#FF3B30",
  ];
  const hasTrend = (charts.hiringTrend?.length ?? 0) >= 2;
  const hasDepts = (charts.departments?.length ?? 0) > 0;

  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const greeting = getGreetingDetails();
  const GreetingIcon = greeting.icon;
  const formattedName = userName
    ? userName.replace(/\b\w/g, (char: string) => char.toUpperCase())
    : "User";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        employeeToEdit={null}
      />
      <TempPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        data={createdCredentials}
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-[#F4F7FF] via-white to-[#FFF7F0] p-6 md:p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#316AFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#FF8400]/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
              <Sparkles className="w-3 h-3 text-[#316AFF]" />
              {currentDateFormatted}
            </div>
            <div className="flex items-center gap-2">
              <h1 className="mt-3 flex flex-wrap items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                <span className="inline-flex items-center gap-2">
                  <GreetingIcon
                    className={`w-7 h-7 ${greeting.color} inline-block animate-bounce`}
                  />
                  {greeting.text}, welcome back,
                </span>
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#316AFF] to-[#1D4ED8] bg-clip-text text-transparent font-extrabold">
                  {formattedName}!
                  <span className="text-2xl animate-pulse inline-block">
                    👋
                  </span>
                </span>
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
              Here&apos;s a quick overview of your workspace activities today.
            </p>
          </div>
          {hasHrRole && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#316AFF] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(49,106,255,0.55)] transition-all hover:bg-[#2554d7] hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Stats (Visible only to HR/Admin) */}
      {hasHrRole && statCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_-12px_rgba(16,24,40,0.18)]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[3px] opacity-80"
                  style={{ background: stat.color }}
                />
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tint}`}
                >
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div className="mt-4">
                  {loading ? (
                    <div className="h-8 w-12 animate-pulse rounded-md bg-slate-100" />
                  ) : (
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                      {stat.value}
                    </h2>
                  )}
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {stat.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {stat.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts row (Visible only to HR/Admin) */}
      {hasHrRole && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard
            title="Workforce Status"
            subtitle="Working vs on leave today"
          >
            <DonutChart
              segments={workforceSegments}
              centerValue={stats.totalEmployees}
              centerLabel="Employees"
              loading={loading}
            />
          </ChartCard>

          <ChartCard
            title="Pending Approvals"
            subtitle="Items waiting for your action"
          >
            <DonutChart
              segments={pendingSegments}
              centerValue={stats.pendingLeaves + stats.pendingReimbursements}
              centerLabel="Pending"
              loading={loading}
            />
          </ChartCard>

          <ChartCard title="At a Glance" subtitle="All key numbers compared">
            <BarList items={overviewBars} loading={loading} />
          </ChartCard>
        </div>
      )}

      {/* Hiring Trends / Analytics (Visible to HR/Admin) */}
      {hasHrRole && (hasTrend || hasDepts) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {hasTrend && (
            <ChartCard
              title="Hiring Trend"
              subtitle="New joins over time"
              className={hasDepts ? "lg:col-span-3" : "lg:col-span-5"}
            >
              <AreaChart data={charts.hiringTrend!} />
            </ChartCard>
          )}
          {hasDepts && (
            <ChartCard
              title="Department Split"
              subtitle="Employees by department"
              className={hasTrend ? "lg:col-span-2" : "lg:col-span-5"}
            >
              <BarList
                loading={false}
                items={charts.departments!.map((d, i) => ({
                  label: d.name,
                  value: d.count,
                  color: deptColors[i % deptColors.length],
                }))}
              />
            </ChartCard>
          )}
        </div>
      )}

      {/* Lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Modules */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/70 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quick Navigation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jump straight to your modules
              </p>
            </div>
            <span className="rounded-full bg-[#316AFF]/10 px-3 py-1 text-[11px] font-semibold text-[#316AFF]">
              Shortcuts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:border-[#316AFF]/30 hover:bg-white hover:shadow-[0_8px_20px_-10px_rgba(49,106,255,0.35)]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.iconStyle}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {m.title}
                    </p>
                    <p className="text-[11px] text-slate-400">{m.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#316AFF]" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Attention panel (Managers / HR only) */}
        {hasManagerRole ? (
          <div className="lg:col-span-2 flex flex-col rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#F4F7FF] to-white p-5 md:p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime sync active
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">
                  Needs your attention
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Leave requests and advance salary claims awaiting review.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {attention.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-all hover:border-[#316AFF]/30 hover:shadow-sm"
                >
                  <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                  <span className="flex-1 text-xs font-medium text-slate-600">
                    {item.label}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
                    {loading ? "…" : item.count}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between pt-5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Notification system connected
              </span>
              <span className="font-semibold text-emerald-600">Online</span>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#F4F7FF] to-white p-5 md:p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                Employee Portal
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">
                Quick Info
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Submit your leave requests or file expense reimbursement claims
                through the navigation shortcuts on the left.
              </p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Connected to HRMS
              </span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}