"use client";

import React, { useState, useEffect } from "react";
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  AlertCircle,
  Award,
} from "lucide-react";

interface TrainingItem {
  id: string; // This is the schedule_id
  training_module_id: string;
  module_title: string;
  module_code: string;
  module_category: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url?: string;
  completion_threshold: number;
  employee_status: "not_started" | "in_progress" | "completed";
  watch_percent: number;
  max_watched_seconds?: number;
  due_date?: string;
}

export default function EmployeeTrainingPage() {
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<TrainingItem | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/v1/training/schedules");
      const json = await res.json();
      if (json.data?.success || json.success) {
        setTrainings(json.data?.data || json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch training schedules", err);
    } finally {
      setLoading(false);
    }
  };

  // Background progress tracking when modal is open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedTraining) {
      let currentWatched = selectedTraining.max_watched_seconds || 0;
      
      timer = setInterval(() => {
        currentWatched += 10; // add 10 seconds every interval
        if (currentWatched <= selectedTraining.duration_seconds) {
          updateProgress(selectedTraining.id, currentWatched, currentWatched);
        }
      }, 10000);
    }
    return () => clearInterval(timer);
  }, [selectedTraining]);

  const updateProgress = async (scheduleId: string, watchedSec: number, currentPos: number) => {
    try {
      const res = await fetch("/api/v1/training/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          training_schedule_id: scheduleId,
          watch_seconds: watchedSec,
          current_position: currentPos,
          acknowledged: false
        })
      });
      const json = await res.json();
      if (json.data?.success || json.success) {
        fetchSchedules(); // refresh to update percentages on cards
      }
    } catch (err) {
      console.error("Failed to update progress", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Not Started
          </span>
        );
    }
  };

  const completedCount = trainings.filter(
    (t) => t.employee_status === "completed",
  ).length;

  const getEmbedUrl = (url: string) => {
    try {
      if (!url) return "";
      if (url.includes("embed/")) return url;
      const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match?.[2]}?autoplay=1`
        : url;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-6">
      {/* Clean Minimal Banner with Herbal Theme */}
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f5e9] text-[#1b4332] text-xs font-semibold border border-emerald-100">
            <BookOpen className="w-3.5 h-3.5" /> Learning & Development
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Training & <span className="text-[#1b4332]">Compliance Portal</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Complete your mandatory department training modules and keep your
            professional skills up to date in one place.
          </p>
        </div>

        <div className="w-full lg:w-auto flex items-center gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#1b4332]">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {completedCount} / {trainings.length}
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed Modules
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Assigned Trainings */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Loading training modules...
        </div>
      ) : trainings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
          <Award className="w-12 h-12 text-[#1b4332] mx-auto opacity-80" />
          <h3 className="text-lg font-semibold text-slate-800">
            No active training assigned
          </h3>
          <p className="text-sm text-slate-500">
            You are all caught up! There are no pending training schedules for
            your department right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
            >
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#e8f5e9] text-[#1b4332] uppercase tracking-wider">
                      {item.module_category}
                    </span>
                    {getStatusBadge(item.employee_status || "not_started")}
                  </div>

                  <h3 className="font-semibold text-slate-900 text-lg line-clamp-2">
                    {item.module_title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Code: {item.module_code}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Progress</span>
                      <span>{Math.round(item.watch_percent || 0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#2d6a4f] h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.watch_percent || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>⏱️ {Math.ceil(item.duration_seconds / 60)} mins</span>
                    {item.due_date && <span>📅 Due: {item.due_date}</span>}
                  </div>

                  <button
                    onClick={() => setSelectedTraining(item)}
                    className="w-full py-2.5 px-4 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/10"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {item.employee_status === "completed"
                      ? "Review Training"
                      : "Start / Continue"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal with Tracking */}
      {selectedTraining && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedTraining.module_title}
              </h3>
              <button
                onClick={() => setSelectedTraining(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center">
              <iframe
                src={getEmbedUrl(selectedTraining.video_url)}
                title={selectedTraining.module_title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Completion requirement: Watch at least{" "}
                {selectedTraining.completion_threshold}% (Leave modal open to record progress)
              </span>
              <button
                onClick={() => setSelectedTraining(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
              >
                Close & Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}