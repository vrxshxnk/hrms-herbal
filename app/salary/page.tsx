"use client";

import React, { useState, useEffect } from "react";
import { 
  Banknote, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertCircle,
  Loader2,
  Check,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SalaryRequest {
  id: string;
  employee_id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  work_email?: string;
  request_type: string;
  amount_requested: number;
  approved_amount?: number;
  tenure_months: number;
  reason: string;
  status: "Pending" | "In_Review" | "Approved" | "Rejected" | "Disbursed";
  manager_status: string;
  hr_status: string;
  finance_status: string;
  created_at: string;
}

export default function AdvanceSalaryPage() {
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { token, user, roles} = useAuth(); 
  console.log("user h", user);
  console.log("role", roles);
  const isManager = roles.includes("manager") || roles.includes("super_manager");
  const isHR = roles.includes("hr") || roles.includes("hr_admin") || roles.includes("admin");
  const isFinance = roles.includes("finance") || roles.includes("admin");

  // Form State
  const [requestType, setRequestType] = useState("advance");
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("1");
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (token) {
      fetchRequests();
    }
  }, [token]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/v1/salary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.data?.success || result.data) {
        setRequests(result.data?.data  || []);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handles Manager, HR, and Finance Approvals using existing PATCH route
  const handleApprovalAction = async (
    requestId: string,
    actionRole: "manager" | "hr" | "finance",
    status: "Approved" | "Rejected" | "Disbursed"
  ) => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch("/api/v1/salary", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          actionRole,
          status,
          remarks: `${status} by ${actionRole.toUpperCase()}`,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || result.message || "Failed to update request");
      }

      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    if (!token) {
      setErrorMsg("Authentication token not loaded.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestType,
          amountRequested: Number(amount),
          tenureMonths: Number(tenure),
          reason,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || result.message || "Failed to submit request");
      }

      setIsModalOpen(false);
      setAmount("");
      setReason("");
      fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "Approved":
      case "DISBURSED":
      case "Disbursed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case "REJECTED":
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advance Salary & Loans</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dashboard / <span className="text-[#316AFF] font-medium">Salary Requests</span>
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#316AFF] hover:bg-blue-600 text-white rounded-xl text-xs font-medium transition-all shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Advance Request</span>
        </button>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#316AFF] flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Requests</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{requests.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active / Pending</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {requests.filter((r) => r.status === "Pending" || r.status === "In_Review").length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Disbursed / Approved</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {requests.filter((r) => ["Disbursed", "Approved", "APPROVED", "DISBURSED"].includes(r.status)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Request History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Request History</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#316AFF]" />
            <span>Loading request records...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No advance salary or loan requests submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-medium">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Amount Requested</th>
                  <th className="p-4">Tenure</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Approval Chain</th>
                  <th className="p-4">Overall Status</th>
                  {(isManager || isHR || isFinance) && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => {
                  const empName = req.first_name ? `${req.first_name} ${req.last_name || ""}` : "Self";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Info */}
                      <td className="p-4 font-medium text-slate-900">
                        <div>
                          <p className="capitalize font-semibold">{empName}</p>
                          {req.employee_code && (
                            <p className="text-[10px] text-slate-400">{req.employee_code}</p>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-slate-900 capitalize">
                        {req.request_type.replace("_", " ")}
                      </td>

                      <td className="p-4 font-medium text-slate-900">
                        ₹{Number(req.amount_requested).toLocaleString("en-IN")}
                      </td>

                      <td className="p-4 text-slate-500">{req.tenure_months} Month(s)</td>

                      <td className="p-4 text-slate-500 max-w-xs truncate">{req.reason}</td>

                      <td className="p-4 text-slate-500">
                        {new Date(req.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Mgr: {req.manager_status}
                          </span>
                          <span>→</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            HR: {req.hr_status}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">{getStatusBadge(req.status)}</td>

                      {/* Approval Actions Column */}
                      {(isManager || isHR || isFinance) && (
                        <td className="p-4 text-right">
                          {actionLoadingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#316AFF] inline" />
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Manager Action */}
                              {isManager && req.manager_status === "Pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprovalAction(req.id, "manager", "Approved")}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    title="Manager Approve"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleApprovalAction(req.id, "manager", "Rejected")}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                    title="Manager Reject"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* HR Action */}
                              {isHR && req.manager_status === "Approved" && req.hr_status === "Pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprovalAction(req.id, "hr", "Approved")}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    title="HR Approve"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleApprovalAction(req.id, "hr", "Rejected")}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                    title="HR Reject"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Finance Action */}
                              {isFinance && req.hr_status === "Approved" && req.finance_status === "Pending" && (
                                <button
                                  onClick={() => handleApprovalAction(req.id, "finance", "Disbursed")}
                                  className="px-2 py-1 rounded-lg bg-blue-50 text-[#316AFF] hover:bg-blue-100 transition-colors font-medium text-[11px]"
                                >
                                  Disburse
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Request Salary Advance</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Request Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#316AFF]"
                >
                  <option value="advance">Salary Advance (1 Month)</option>
                  <option value="loan">Personal Loan (Multi-Month)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Amount Required (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#316AFF]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tenure (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#316AFF]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the purpose of this request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#316AFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#316AFF] hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}