"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Calendar, Layers, ShieldCheck, CheckCircle, AlertCircle, X, Clock } from "lucide-react";

interface TrainingModule {
  id: string;
  code: string;
  title: string;
  category: string;
  duration_seconds: number;
  video_url: string;
}

interface Department {
  id: string;
  name: string;
}

export default function HRTrainingManagementPage() {
  const [activeTab, setActiveTab] = useState<"modules" | "schedules">("modules");
  
  // Form states for creating module
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("compliance");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(300);

  // Data lists & loading states
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  // Schedule form states
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Custom Alert Popup State
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchModules();
    fetchDepartments();
  }, []);

  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const res = await fetch("/api/v1/training/modules");
      const json = await res.json();
      if (json.success || json.data?.success) {
        setModules(json.data?.data || json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch modules", err);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/v1/departments");
      const json = await res.json();
      if (json.success || json.data?.data) {
        setDepartments(json.data?.data || json);
      }
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);

    try {
      const res = await fetch("/api/v1/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title,
          category,
          video_url: videoUrl,
          duration_seconds: Number(duration),
          completion_threshold: 90,
          requires_acknowledgement: true,
          is_mandatory: true,
          is_active: true
        })
      });
      const json = await res.json();
      
      if (json.success || json.data?.success) {
        setAlertInfo({ type: "success", message: json.message || json.data?.message || "Training module created successfully!" });
        setTitle("");
        setCode("");
        setVideoUrl("");
        fetchModules();
      } else {
        setAlertInfo({ type: "error", message: json.error?.message || json.message || "Failed to create module" });
      }
    } catch (err: any) {
      console.error(err);
      setAlertInfo({ type: "error", message: err.message || "An unexpected error occurred" });
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);

    try {
      const res = await fetch("/api/v1/training/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          training_module_id: selectedModuleId,
          department_id: selectedDeptId,
          start_date: startDate,
          due_date: dueDate || null,
          notes: notes || null
        })
      });
      const json = await res.json();

      if (json.success || json.data?.success) {
        setAlertInfo({ type: "success", message: json.message || json.data?.message || "Training schedule assigned successfully!" });
        setSelectedModuleId("");
        setSelectedDeptId("");
        setStartDate("");
        setDueDate("");
        setNotes("");
      } else {
        setAlertInfo({ type: "error", message: json.error?.message || json.message || "Failed to assign schedule" });
      }
    } catch (err: any) {
      console.error(err);
      setAlertInfo({ type: "error", message: err.message || "An unexpected error occurred" });
    }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* Custom Popup Alert Banner */}
      {alertInfo && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
          alertInfo.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            {alertInfo.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{alertInfo.message}</span>
          </div>
          <button 
            onClick={() => setAlertInfo(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1b4332] text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> HR Administration Console
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Training Program Management</h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("modules")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'modules' ? 'bg-white text-[#1b4332] shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Modules Library
          </button>
          <button
            onClick={() => setActiveTab("schedules")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'schedules' ? 'bg-white text-[#1b4332] shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Assign Schedules
          </button>
        </div>
      </div>

      {/* Content based on Tab */}
      {activeTab === 'modules' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Module Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 lg:col-span-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#1b4332]" /> Create New Module
            </h3>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Module Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Data Security 2026" 
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f]"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Module Code</label>
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value)}
                  placeholder="e.g. SEC-001" 
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f]"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f] bg-white text-slate-700"
                >
                  <option value="compliance">Compliance</option>
                  <option value="safety">Safety</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="technical">Technical</option>
                  <option value="soft_skills">Soft Skills</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Video URL (YouTube / MP4)</label>
                <input 
                  type="url" 
                  value={videoUrl} 
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f]"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (Seconds)</label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f]"
                  required 
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-medium rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                Save & Publish Module
              </button>
            </form>
          </div>

          {/* Existing Modules List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#1b4332]" /> Existing Modules ({modules.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500">All available training modules in the system library.</p>
            
            {loadingModules ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading modules...</div>
            ) : modules.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                No training modules created yet. Create one using the form on the left.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {modules.map((mod) => (
                  <div key={mod.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#e8f5e9] text-[#1b4332]">
                          {mod.code}
                        </span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{mod.category}</span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm">{mod.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {Math.ceil(mod.duration_seconds / 60)} mins
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Assign Schedules Tab */
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-[#1b4332]" /> Assign Training Schedule
            </h3>
            <p className="text-xs text-slate-500">Select a module and assign it to a specific department with start and due dates.</p>
          </div>

          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Training Module</label>
              <select
                value={selectedModuleId}
                onChange={e => setSelectedModuleId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f] bg-white text-slate-700"
                required
              >
                <option value="">-- Choose Module --</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.title} ({m.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Department</label>
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f] bg-white text-slate-700"
                required
              >
                <option value="">-- Choose Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f] text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f] text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Instructions (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any additional guidelines for the department..."
                rows={3}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#2d6a4f] text-slate-700"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-medium rounded-xl text-sm transition-all shadow-sm shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              Assign Schedule to Department
            </button>
          </form>
        </div>
      )}
    </div>
  );
}