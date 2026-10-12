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
  User,
  Clock,
  Building2,
  AlertCircle
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
  const { token } = useAuth();
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

  const fetchAnnouncements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/announcements", {
        headers: {
          "Authorization": `Bearer ${token}`,
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
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };
      const res = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.data?.success) {
        setIsModalOpen(false);
        setFormData({ title: "", content: "", priority: "medium", expires_at: "", is_published: true });
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

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-rose-50 text-rose-700 border-rose-200/80";
      case "high":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "medium":
        return "bg-sky-50 text-sky-700 border-sky-200/80";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Banner Section */}
        <div className="relative bg-gradient-to-r from-white via-slate-50/50 to-blue-50/30 border border-slate-200/80 rounded-3xl p-8 lg:p-10 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-semibold">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Company Broadcasts</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Create & Manage <br /> Organization Announcements
            </h1>
            <p className="text-slate-500 text-sm lg:text-base leading-relaxed">
              Publish critical updates, policy changes, and department news directly to your team.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </button>
          </div>

          <div className="relative w-64 h-44 shrink-0 flex items-center justify-center">
            <svg className="absolute top-0 right-6 w-10 h-10 text-slate-300" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 20 Q 25 5, 40 20 T 20 40" />
            </svg>
            <svg className="absolute top-6 right-20 w-12 h-12 text-amber-400" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="25,5 45,40 5,40" />
            </svg>
            <svg className="absolute top-12 left-4 w-14 h-14 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-44 h-40" viewBox="0 0 160 140" fill="none">
              <path d="M50 140 C50 100, 70 80, 100 80 C130 80, 160 100, 160 140" fill="#2563EB" />
              <circle cx="125" cy="55" r="7" fill="#F59E0B" />
              <path d="M100 80 C100 50, 130 50, 130 70 C130 90, 100 90, 100 80 Z" fill="#0F172A" />
              <path d="M90 60 C90 45, 120 45, 120 60 C120 75, 90 75, 90 60 Z" fill="#FFF" stroke="#0F172A" strokeWidth="2" />
              <path d="M40 90 Q 60 80, 75 110" stroke="#0F172A" strokeWidth="2.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search announcements by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 shadow-xs"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-white border border-slate-200 px-4 py-2.5 pr-10 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
            >
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* List Section */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center bg-rose-50/80 text-rose-700 rounded-2xl border border-rose-200/60 text-sm font-medium flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No announcements found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">There are no published announcements matching your search query or selected year.</p>
          </div>
        ) : (
          <div className="space-y-4">
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

              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/70">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {targetLabel}
                      </span>
                      <span className={`capitalize px-2.5 py-1 text-xs font-semibold rounded-lg border ${getPriorityStyle(item.priority)}`}>
                        {item.priority} Priority
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">{item.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.content}</p>
                  </div>

                  <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Author: <strong className="text-slate-700 font-semibold">{authorName}</strong>
                    </span>
                    {item.expires_at && (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Expires: {new Date(item.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900">New Announcement</h3>
                <p className="text-xs text-slate-400">Broadcast an update to employees across your organization.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Updated Employee Benefits Policy 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Expiration (Optional)</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write details of the announcement here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-3 flex justify-end items-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}