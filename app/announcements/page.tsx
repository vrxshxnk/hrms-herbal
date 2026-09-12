"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext"; 
import { 
  Search, 
  X, 
  ChevronDown 
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

  return (
    <div className="min-h-screen bg-background text-[#1E293B] p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        

        <div className="relative bg-white border border-[#E2E8F0] rounded-3xl p-8 lg:p-10 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 z-10 max-w-md">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Create <br /> Announcement
            </h1>
            <p className="text-[#94A3B8] text-lg font-medium leading-relaxed">
              Make a announcement to your employee
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-6 py-3 bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] text-[#0F172A] font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 border border-[#CBD5E1]"
            >
              Create Now
            </button>
          </div>

          <div className="relative w-64 h-44 shrink-0 flex items-center justify-center">
            <svg className="absolute top-0 right-6 w-10 h-10 text-[#0F172A]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 20 Q 25 5, 40 20 T 20 40" />
            </svg>
            <svg className="absolute top-6 right-20 w-12 h-12 text-[#F59E0B]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="25,5 45,40 5,40" />
            </svg>
            <svg className="absolute top-12 left-4 w-14 h-14 text-[#2563EB]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-44 h-40" viewBox="0 0 160 140" fill="none">
              <path d="M50 140 C50 100, 70 80, 100 80 C130 80, 160 100, 160 140" fill="#2563EB" />
              <circle cx="125" cy="55" r="7" fill="#F59E0B" />
              <path d="M100 80 C100 50, 130 50, 130 70 C130 90, 100 90, 100 80 Z" fill="#000" />
              <path d="M90 60 C90 45, 120 45, 120 60 C120 75, 90 75, 90 60 Z" fill="#FFF" stroke="#000" strokeWidth="2" />
              <path d="M40 90 Q 60 80, 75 110" stroke="#000" strokeWidth="2.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] text-[#0F172A]"
            />
          </div>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-white border border-[#E2E8F0] px-4 py-2.5 pr-10 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none"
            >
              <option value="2026">2026 v</option>
              <option value="2025">2025 v</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#94A3B8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* List Section */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-[#E2E8F0] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
            {error}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
            <h3 className="text-base font-semibold text-[#0F172A]">No announcements found</h3>
            <p className="text-sm text-[#94A3B8]">There are no published announcements available.</p>
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
                  className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#F1F5F9] text-[#475569] text-xs font-semibold rounded-full border border-[#E2E8F0]">
                        {targetLabel}
                      </span>
                      <span className="capitalize px-2.5 py-0.5 text-xs font-medium text-[#64748B] bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                        {item.priority}
                      </span>
                    </div>
                    <span className="text-xs text-[#94A3B8]">
                      {new Date(item.published_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-[#0F172A]">{item.title}</h2>
                    <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">{item.content}</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-[#94A3B8] border-t border-[#F1F5F9]">
                    <span>By: <strong className="text-[#334155] font-medium">{authorName}</strong></span>
                    {item.expires_at && (
                      <span>Expires: {new Date(item.expires_at).toLocaleDateString()}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">New Announcement</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#475569]">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Title of announcement..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#475569]">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#475569]">Expiration (Optional)</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#475569]">Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Announcement message..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] text-[#0F172A] font-semibold rounded-xl border border-[#CBD5E1] hover:opacity-90"
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