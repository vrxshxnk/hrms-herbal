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
  ChevronRight,
  Wallet,
  LogOut,
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
      <path d={area} fill="#edf3ef" />
      <path
        d={line}
        fill="none"
        stroke="#24563E"
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
            stroke="#24563E"
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
    roles.includes("hradmin") ||
    roles.includes("admin") ||
    roles.includes("system_admin");
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

  const statCards = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      note: "Active roster",
      icon: Users,
      color: "#B17A45",
      tint: "bg-[#FFF3E6]",
    },
    {
      title: "New Hires (30d)",
      value: stats.newEmployees,
      note: "Recent joins",
      icon: UserPlus,
      color: "#547F76",
      tint: "bg-[#EDF3EF]",
    },
    {
      title: "On Leave Today",
      value: stats.onLeave,
      note: "Approved leaves",
      icon: Calendar,
      color: "#A7833D",
      tint: "bg-[#FFF8E1]",
    },
    ...(hasManagerRole
      ? [
          {
            title: "Pending Leaves",
            value: stats.pendingLeaves,
            note: "Requires action",
            icon: Briefcase,
            color: "#397052",
            tint: "bg-[#E8F7F0]",
          },
          {
            title: "Pending Reimbursements",
            value: stats.pendingReimbursements,
            note: "Expense claims",
            icon: Clock,
            color: "#B86052",
            tint: "bg-[#FFECEB]",
          },
        ]
      : []),
  ];

  const modules = [
    {
      href: "/leave",
      title: "Leaves",
      desc: "Manage & apply requests",
      icon: Calendar,
      iconStyle: "bg-brand-50 text-brand-600",
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
      label: "Not on leave",
      value: Math.max(stats.totalEmployees - stats.onLeave, 0),
      color: "#24563E",
    },
    { label: "On leave", value: stats.onLeave, color: "#B59B55" },
  ];

  const pendingSegments: Segment[] = [
    { label: "Leave approvals", value: stats.pendingLeaves, color: "#397052" },
    {
      label: "Reimbursements",
      value: stats.pendingReimbursements,
      color: "#B86052",
    },
  ];

  const overviewBars = statCards.map((s) => ({
    label: s.title,
    value: s.value,
    color: s.color,
  }));

  const deptColors = [
    "#24563E",
    "#547F76",
    "#B17A45",
    "#397052",
    "#8C7953",
    "#B86052",
  ];
  const hasTrend = (charts.hiringTrend?.length ?? 0) >= 2;
  const hasDepts = (charts.departments?.length ?? 0) > 0;

  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const greeting = { text: getGreeting() };
  const formattedName = userName
    ? userName.replace(/\b\w/g, (char: string) => char.toUpperCase())
    : "User";
  return (
    <div className="space-y-6">
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

      <div className="page-intro">
        <div><p className="eyebrow">Your workspace</p><h1>Overview</h1><p>A clear view of your people and the day ahead.</p></div>
        <span className="text-xs text-slate-500 flex items-center gap-2"><Calendar size={15} />{currentDateFormatted}</span>
      </div>
      <section className="overview-hero">
        <div><p className="eyebrow">A little clarity for your day</p><h1>{greeting.text}, {formattedName.split(" ")[0]}.</h1><p>{hasManagerRole ? "Keep your team moving. Review requests, manage time, and stay connected." : "Your time, requests, and updates. Everything you need in one place."}</p></div>
        {hasHrRole ? <button type="button" onClick={() => setIsModalOpen(true)} className="button-primary shrink-0"><Plus size={16} />Add employee</button> : <Link href="/leave" className="button-primary shrink-0"><Plus size={16} />Request time off</Link>}
      </section>
      {hasHrRole && <div className="overview-stats">
        {statCards.map(stat => <div key={stat.title} className="overview-stat">
          <div className="overview-stat-top"><span>{stat.title}</span><stat.icon size={16} strokeWidth={1.6} /></div>
          {loading ? <div className="my-4 h-8 w-12 animate-pulse bg-slate-100 rounded" /> : <strong>{stat.value}</strong>}
          <small>{stat.note}</small>
        </div>)}
      </div>}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-5"><h2 className="text-sm font-semibold">Make your next move</h2><p className="text-xs text-slate-500 mt-1">The everyday, a little easier.</p></div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[{ href: "/employee", title: "Find your people", desc: "Browse the employee directory", icon: Users }, { href: "/attendance", title: "Manage attendance", desc: "Daily records, imports & corrections", icon: Clock }, ...modules.slice(0, 2)].map(item => <Link key={item.href} href={item.href} className="group flex items-center gap-3 border border-slate-200 rounded-lg p-4 hover:border-brand-300 hover:bg-brand-50 transition-colors"><span className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-brand-600"><item.icon size={18} /></span><span className="flex-1"><span className="block text-xs font-semibold">{item.title}</span><span className="block mt-1 text-[11px] text-slate-500">{item.desc}</span></span><ChevronRight size={15} className="text-slate-400" /></Link>)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="eyebrow">{hasManagerRole ? "Action center" : "Stay in the loop"}</p>
          <h2 className="text-lg font-semibold mt-2">{hasManagerRole ? "Needs your attention" : "Your team, connected"}</h2>
          <p className="text-xs text-slate-500 mt-2 mb-5 leading-relaxed">{hasManagerRole ? "Requests waiting for your review." : "Catch up on company news or find answers to everyday questions."}</p>
          {hasManagerRole ? attention.map(item => <Link key={item.href} href={item.href} className="flex gap-3 items-center py-4 border-t border-slate-100"><span className="flex-1 text-xs text-slate-600">{item.label}</span><span className="min-w-7 text-center px-2 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold">{loading ? "…" : item.count}</span><ChevronRight size={14} /></Link>) : <div className="space-y-3"><Link href="/announcements" className="block text-sm text-brand-600">Read announcements →</Link><Link href="/faq" className="block text-sm text-brand-600">Visit the help center →</Link></div>}
        </div>
      </section>

      {/* Charts row */}
      {hasHrRole && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Workforce availability"
          subtitle="Employees not on approved leave vs on leave"
        >
          <DonutChart
            segments={workforceSegments}
            centerValue={stats.totalEmployees}
            centerLabel="Employees"
            loading={loading}
          />
        </ChartCard>

        {hasManagerRole && (
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
        )}

        <ChartCard title="At a Glance" subtitle="All key numbers compared">
          <BarList items={overviewBars} loading={loading} />
        </ChartCard>
      </div>}

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

    </div>
  );
}
