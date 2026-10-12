"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  XCircle,
  Loader2,
  UserCheck,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";

interface ResignationRequest {
  id: string;
  reason: string;
  proposed_last_working_day: string;
  official_last_working_day?: string;
  notice_period_days: number;
  comments?: string;
  manager_status: string;
  hr_status: string;
  final_status: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  work_email?: string;
}

export default function ResignationPage() {
  const { roles, token } = useAuth();

  // Role Checks
  const isManager = roles?.some((r: string) =>["manager", "super_manager"].includes(r));
  const isHR = roles?.some((r: string) =>["hr", "hr_admin", "admin"].includes(r));
  const isFinance = roles?.some((r: string) =>["finance", "admin"].includes(r));
  const isPrivilegedUser = isManager || isHR || isFinance;

  // View Scope Tab State
  const [activeTab, setActiveTab] = useState<"self" | "team" | "all">("self");

  // Data States
  const [requests, setRequests] = useState<ResignationRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Submission Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [formData, setFormData] = useState({
    reason: "",
    proposed_last_working_day: "",
    notice_period_days: 30,
    comments: "",
  });

  // Approval Processing State
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchResignationData(activeTab);
  }, [activeTab]);

  const fetchResignationData = async (scope: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/exit/resignation?scope=${scope}`,{
         headers:{
            "Authorization":`Bearer ${token}`
         }
      });
      const result = await res.json();
      if (result.data?.success) {
        setRequests(result.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load resignation data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (formData.reason.length < 10) {
      setFormError("Resignation reason must be at least 10 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/exit/resignation", {
        method: "POST",
        headers: { "Content-Type": "application/json","Authorization":`Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok || !result.data?.success) {
        throw new Error(result.message || "Failed to submit request");
      }

      setIsModalOpen(false);
      setFormData({
        reason: "",
        proposed_last_working_day: "",
        notice_period_days: 30,
        comments: "",
      });
      fetchResignationData("self");
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalAction = async (
    requestId: string,
    stage: "manager" | "hr",
    status: "Approved" | "Rejected"
  ) => {
    try {
      setProcessingId(requestId);
      const res = await fetch("/api/v1/exit/resignation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json","Authorization":`Bearer ${token}` },
        body: JSON.stringify({
          requestId,
          stage,
          status,
          remarks: `${status} by ${stage.toUpperCase()}`,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.data?.success) {
        throw new Error(result.message || "Approval update failed");
      }

      fetchResignationData(activeTab);
    } catch (err: any) {
      alert(err.message || "Failed to process approval");
    } finally {
      setProcessingId(null);
    }
  };

  // KPI Calculations (Privileged views)
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) =>["Submitted", "Pending"].includes(r.final_status)).length;
  const approvedCount = requests.filter((r) =>["Clearance_In_Progress", "Completed", "Manager_Approved"].includes(r.final_status)).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Resignation & Exit Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dashboard / <span className="text-blue-600 font-medium">Resignations</span>
          </p>
        </div>

        {/* Regular Employees only see Submit Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Resignation Claim
        </button>
      </div>

      {/* KPI Stats Bar - VISIBLE ONLY FOR MANAGERS / HR / ADMINS */}
      {isPrivilegedUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Claims
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {totalCount}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Pending Approvals
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {pendingCount}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Approved / Settled
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {approvedCount}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Scope Switcher Tabs - VISIBLE FOR MANAGERS / HR */}
      {isPrivilegedUser && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("self")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "self"
                ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            My Resignations
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "team"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Team Requests
            </button>
          )}
          {isHR && (
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "all"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Resignations (HR)
            </button>
          )}
        </div>
      )}

      {/* Main List Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">
            Submitted Requests & Approvals
          </h2>
          <span className="text-xs font-medium text-slate-400">
            Showing {requests.length} records
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" />
            Loading records...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No resignation requests found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((item) => {
              const isExpanded = expandedRow === item.id;
              const isProcessing = processingId === item.id;

              return (
                <div key={item.id} className="transition-colors hover:bg-slate-50/50">
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <button className="text-slate-400 hover:text-slate-600 mt-0.5">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        {/* Employee Name Header when Manager/HR views */}
                        {item.first_name && (
                          <p className="text-xs font-bold text-blue-600 mb-0.5">
                            {item.first_name} {item.last_name}{" "}
                            <span className="text-slate-400 font-normal">
                              ({item.employee_code})
                            </span>
                          </p>
                        )}
                        <h4 className="font-medium text-slate-900 text-sm line-clamp-1">
                          {item.reason}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Proposed Last Working Day:{" "}
                          <span className="font-medium text-slate-600">
                            {new Date(
                              item.proposed_last_working_day
                            ).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Step Approval Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      {/* Manager Stage */}
                      <span
                        className={`px-3 py-1.5 rounded-lg border ${
                          item.manager_status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.manager_status === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        Mgr: {item.manager_status || "Pending"}
                      </span>

                      <span className="text-slate-300">→</span>

                      {/* HR Stage */}
                      <span
                        className={`px-3 py-1.5 rounded-lg border ${
                          item.hr_status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.hr_status === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        HR: {item.hr_status || "Pending"}
                      </span>

                      <span className="text-slate-300">→</span>

                      {/* Final Stage Status */}
                      <span
                        className={`px-3 py-1.5 rounded-lg border ${
                          item.final_status === "Completed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : item.final_status === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Final: {item.final_status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Row Action Drawer */}
                  {isExpanded && (
                    <div className="px-12 pb-5 text-xs text-slate-600 bg-slate-50/50 space-y-3 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p>
                            <strong className="text-slate-700">
                              Notice Period Required:
                            </strong>{" "}
                            {item.notice_period_days} Days
                          </p>
                          {item.official_last_working_day && (
                            <p className="mt-1">
                              <strong className="text-slate-700">
                                Official Last Working Day:
                              </strong>{" "}
                              {new Date(
                                item.official_last_working_day
                              ).toLocaleDateString()}
                            </p>
                          )}
                          <p className="mt-1 text-slate-400">
                            Submitted on: {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>

                        {item.comments && (
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <p className="font-medium text-slate-700 mb-1">
                              Employee Comments:
                            </p>
                            <p className="text-slate-500">{item.comments}</p>
                          </div>
                        )}
                      </div>

                      {/* Manager Inline Actions */}
                      {isManager &&
                        activeTab === "team" &&
                        item.final_status === "Submitted" && (
                          <div className="pt-2 flex items-center gap-3 border-t border-slate-200/60">
                            <span className="font-semibold text-slate-700">
                              Manager Action:
                            </span>
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                handleApprovalAction(item.id, "manager", "Approved")
                              }
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                handleApprovalAction(item.id, "manager", "Rejected")
                              }
                              className="inline-flex items-center gap-1 bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}

                      {/* HR Inline Actions */}
                      {isHR &&
                        activeTab === "all" &&
                        item.manager_status === "Approved" &&
                        item.hr_status === "Pending" && (
                          <div className="pt-2 flex items-center gap-3 border-t border-slate-200/60">
                            <span className="font-semibold text-slate-700">
                              HR Final Action:
                            </span>
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                handleApprovalAction(item.id, "hr", "Approved")
                              }
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve & Initiate Clearance
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                handleApprovalAction(item.id, "hr", "Rejected")
                              }
                              className="inline-flex items-center gap-1 bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submission Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-base">
                Submit Resignation Request
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Last Working Day *
                </label>
                <input
                  type="date"
                  required
                  value={formData.proposed_last_working_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      proposed_last_working_day: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Period (Days)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.notice_period_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notice_period_days: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Resignation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State your reason clearly (at least 10 characters)..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional remarks..."
                  value={formData.comments}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}