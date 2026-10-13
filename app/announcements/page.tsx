"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  Search,
  X,
  ChevronDown,
  Megaphone,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  AlertCircle,
  BellRing,
  Flame,
  CalendarDays,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high" | "critical";
  author_first_name?: string;
  author_last_name?: string;
  author_display_name?: string;
  target_department_name?: string;
  target_location_name?: string;
  target_legal_entity_name?: string;
  published_at: string;
  expires_at?: string;
  is_published: boolean;
}

export default function AnnouncementsPage() {
  const { token, roles } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "medium",
    expires_at: "",
    is_published: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const hasHrOrManagerRoles = roles.includes("hr") || roles.includes("manager");
  const fetchAnnouncements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/announcements", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (res.ok && result.data?.success) {
        setAnnouncements(result.data?.data);
      } else {
        setError(result.message || "Failed to load announcements");
      }
    } catch (err: any) {
      setError("Network error while loading announcements");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Authentication token not found. Please re-login.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        expires_at: formData.expires_at
          ? new Date(formData.expires_at).toISOString()
          : null,
      };
      const res = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.data?.success) {
        setIsModalOpen(false);
        setFormData({
          title: "",
          content: "",
          priority: "medium",
          expires_at: "",
          is_published: true,
        });
        fetchAnnouncements();
      } else {
        alert(result.message || "Failed to publish announcement");
      }
    } catch (err) {
      alert("Error submitting announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    return (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

 
  const priorityTheme: Record<
    string,
    { pill: string; bar: string; dot: string }
  > = {
    critical: {
      pill: "bg-rose-50 text-rose-700 ring-rose-200",
      bar: "bg-rose-500",
      dot: "bg-rose-500",
    },
    high: {
      pill: "bg-amber-50 text-amber-700 ring-amber-200",
      bar: "bg-amber-500",
      dot: "bg-amber-500",
    },
    medium: {
      pill: "bg-blue-50 text-blue-700 ring-blue-200",
      bar: "bg-[#316AFF]",
      dot: "bg-[#316AFF]",
    },
    low: {
      pill: "bg-slate-100 text-slate-600 ring-slate-200",
      bar: "bg-slate-300",
      dot: "bg-slate-400",
    },
  };

  const getTheme = (priority: string) =>
    priorityTheme[priority] || priorityTheme.low;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "HR";

  const now = new Date();
  const urgentCount = announcements.filter(
    (a) => a.priority === "high" || a.priority === "critical",
  ).length;
  const thisMonthCount = announcements.filter((a) => {
    const d = new Date(a.published_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const heroStats = [
    {
      label: "Total posted",
      value: announcements.length,
      icon: BellRing,
      tint: "bg-blue-50 text-[#316AFF]",
    },
    {
      label: "High & critical",
      value: urgentCount,
      icon: Flame,
      tint: "bg-rose-50 text-rose-600",
    },
    {
      label: "This month",
      value: thisMonthCount,
      icon: CalendarDays,
      tint: "bg-emerald-50 text-emerald-600",
    },
  ];

  const inputBase =
    "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#316AFF]/10 focus:border-[#316AFF] transition-all";

  return (
    <div className="min-h-screen bg-[#F7F8FC] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {/* soft background accents */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#EEF3FF] via-white to-[#FFF6EC]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: "radial-gradient(#C9D6F5 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage: "linear-gradient(to left, black 0%, transparent 60%)",
              WebkitMaskImage:
                "linear-gradient(to left, black 0%, transparent 60%)",
            }}
          />
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#316AFF]/10 blur-3xl" />

          <div className="relative grid gap-8 p-6 md:p-9 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <nav className="flex items-center gap-1 text-xs text-slate-400">
                <span>Dashboard</span>
                <span>/</span>
                <span className="font-medium text-slate-500">
                  Announcements
                </span>
              </nav>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold text-[#316AFF] shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#316AFF] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#316AFF]" />
                </span>
                Company Broadcasts
              </div>

              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[34px]">
                Keep every employee{" "}
                <span className="text-[#316AFF]">in the loop</span>
              </h1>
              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-500">
                Publish policy changes, holiday notices and department news in
                one place, so nothing important gets missed.
              </p>

              {hasHrOrManagerRoles && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#316AFF] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(49,106,255,0.65)] transition-all hover:-translate-y-0.5 hover:bg-[#2554d7] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                  Create Announcement
                </button>
              )}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-3 lg:col-span-2 lg:grid-cols-1">
              {heroStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:gap-4 lg:p-4"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tint}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-2xl font-bold leading-none text-slate-900">
                        {loading ? "–" : s.value}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search announcements"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:border-[#316AFF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#316AFF]/10"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:border-[#316AFF] focus:outline-none sm:w-auto"
            >
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-4 rounded-2xl border border-slate-200/70 bg-white p-5"
              >
                <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50 p-6 text-sm font-medium text-rose-700">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-16 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#316AFF]/10 text-[#316AFF]">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              No announcements found
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              There are no published announcements matching your search query or
              selected year.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredAnnouncements.map((item) => {
              const authorName =
                item.author_display_name ||
                `${item.author_first_name || ""} ${item.author_last_name || ""}`.trim() ||
                "HR Admin";

              const targetLabel =
                item.target_department_name ||
                item.target_location_name ||
                item.target_legal_entity_name ||
                "Global Broadcast";

              const theme = getTheme(item.priority);
              const published = new Date(item.published_at);

              return (
                <div
                  key={item.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(16,24,40,0.2)]"
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 ${theme.bar}`}
                  />

                  <div className="flex flex-1 p-5 pl-6">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${theme.pill}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${theme.dot}`}
                          />
                          {item.priority} priority
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {targetLabel}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <CalendarIcon className="h-3 w-3" />
                          {published.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h2 className="mt-2.5 text-[17px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#316AFF]">
                        {item.title}
                      </h2>
                      <p className="mb-4 mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                        {item.content}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#316AFF]/10 text-[10px] font-bold text-[#316AFF]">
                            {getInitials(authorName)}
                          </span>
                          <div className="leading-tight">
                            <p className="text-xs font-semibold text-slate-700">
                              {authorName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Published by
                            </p>
                          </div>
                        </div>

                        {item.expires_at && (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Expires{" "}
                            {new Date(item.expires_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                New Announcement
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-6 py-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={inputBase}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className={inputBase}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Expiration (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) =>
                        setFormData({ ...formData, expires_at: e.target.value })
                      }
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Content
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write the announcement here"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className={`${inputBase} resize-none`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#316AFF] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2554d7] disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
