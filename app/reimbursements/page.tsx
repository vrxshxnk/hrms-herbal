"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Updated category enum to match PostgreSQL uppercase values
export type ReimbursementCategory =
  | "TRAVEL"
  | "FUEL"
  | "STAY"
  | "DINNER"
  | "TRAVEL_TICKET"
  | "MISCELLANEOUS";

interface ReimbursementItem {
  id?: string;
  category: ReimbursementCategory;
  expenseDate: string;
  amount: number;
  merchantName?: string;
  description?: string;
  receiptUrl: string;
  fileMimeType?: string;
}

interface ReimbursementRequest {
  id: string;
  employee_id: string;
  title: string;
  description?: string;
  trip_start_date?: string;
  trip_end_date?: string;
  total_amount: number;
  currency: string;
  status: "Pending" | "Approved" | "Rejected" | "Disbursed";
  manager_status: "Pending" | "Approved" | "Rejected";
  manager_remarks?: string;
  hr_status: "Pending" | "Approved" | "Rejected";
  hr_remarks?: string;
  finance_status: "Pending" | "Approved" | "Rejected" | "Disbursed";
  finance_remarks?: string;
  transaction_reference?: string;
  created_at: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  work_email?: string;
  profile_photo_url?: string;
  items: ReimbursementItem[];
}

export default function ReimbursementPage() {
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );

  const [disburseModal, setDisburseModal] = useState<{
    isOpen: boolean;
    requestId: string | null;
    txnRef: string;
    error?: string;
  }>({
    isOpen: false,
    requestId: null,
    txnRef: "",
  });
  // Auth Context
  const { token, roles } = useAuth();
  const isManager = roles?.some((r: string) =>
    ["manager", "super_manager"].includes(r),
  );
  const isHR = roles?.some((r: string) =>
    ["hr", "hr_admin", "admin"].includes(r),
  );
  const isFinance = roles?.some((r: string) =>
    ["finance", "admin"].includes(r),
  );

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [items, setItems] = useState<ReimbursementItem[]>([
    {
      category: "TRAVEL",
      expenseDate: "",
      amount: 0,
      merchantName: "",
      description: "",
      receiptUrl: "",
    },
  ]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (token) fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/v1/reimbursements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok && result.data?.data) {
        setRequests(result.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load reimbursements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        category: "TRAVEL",
        expenseDate: "",
        amount: 0,
        merchantName: "",
        description: "",
        receiptUrl: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof ReimbursementItem,
    value: any,
  ) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === "amount" ? Number(value) : value,
    };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        title,
        description: description || undefined,
        tripStartDate: tripStartDate || undefined,
        tripEndDate: tripEndDate || undefined,
        currency,
        items,
      };

      const res = await fetch("/api/v1/reimbursements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.message ||
            result.error?.message ||
            "Failed to submit reimbursement",
        );
      }

      setIsModalOpen(false);
      resetForm();
      fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTripStartDate("");
    setTripEndDate("");
    setCurrency("INR");
    setItems([
      {
        category: "TRAVEL",
        expenseDate: "",
        amount: 0,
        merchantName: "",
        description: "",
        receiptUrl: "",
      },
    ]);
    setErrorMsg("");
  };

  // Approval actions matched to schema: "APPROVED" | "REJECTED" | "DISBURSED"
  const handleApprovalAction = async (
    requestId: string,
    stage: "manager" | "hr" | "finance",
    status: "Approved" | "Rejected" | "Disbursed",
    disbursementTxnIdx?: string,
  ) => {
    setActionLoadingId(requestId);
    try {
      const payload: any = {
        requestId,
        stage,
        status,
        remarks: `${stage}  ${status} this request` || undefined,
      };

      if (stage === "finance" && disbursementTxnIdx) {
        payload.disbursementTxnIdx = disbursementTxnIdx;
      }

      const res = await fetch("/api/v1/reimbursements", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.message || result.error?.message || "Action failed",
        );
      }

      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  const totalCalculated = items.reduce(
    (sum, item) => sum + (item.amount || 0),
    0,
  );

  return (
    <>
      {disburseModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-100 p-5 transition-all">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Confirm Disbursement
              </h3>
              <button
                onClick={() =>
                  setDisburseModal({
                    isOpen: false,
                    requestId: null,
                    txnRef: "",
                  })
                }
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter the bank UTR or payment reference ID to complete
              disbursement for this request.
            </p>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Transaction Ref / UTR ID{" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={disburseModal.txnRef}
                onChange={(e) =>
                  setDisburseModal((prev) => ({
                    ...prev,
                    txnRef: e.target.value,
                    error: undefined,
                  }))
                }
                placeholder="e.g. UTR123456789 or UPI Ref"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#24563E]/20 focus:border-[#24563E]"
                autoFocus
              />
              {disburseModal.error && (
                <p className="text-[11px] text-rose-500 mt-1">
                  {disburseModal.error}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setDisburseModal({
                    isOpen: false,
                    requestId: null,
                    txnRef: "",
                  })
                }
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!disburseModal.txnRef.trim()) {
                    setDisburseModal((prev) => ({
                      ...prev,
                      error: "Please enter a transaction reference ID",
                    }));
                    return;
                  }

                  if (disburseModal.requestId) {
                    handleApprovalAction(
                      disburseModal.requestId,
                      "finance",
                      "Disbursed",
                      disburseModal.txnRef.trim(),
                    );
                  }

                  setDisburseModal({
                    isOpen: false,
                    requestId: null,
                    txnRef: "",
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#24563E] hover:bg-brand-600 rounded-lg"
              >
                Submit Disbursement
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Expense Reimbursements
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Submit expenses, attach receipts, and follow each claim through approval.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#24563E] hover:bg-brand-600 text-white rounded-xl text-xs font-medium transition-all shadow-sm shadow-brand-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Expense Claim</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-[#24563E] flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Claims</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {requests.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Pending Claims
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {requests.filter((r) => r.status === "Pending").length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Fully Approved / Settled
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {
                  requests.filter((r) =>
                    ["APPROVED", "DISBURSED", "Approved"].includes(r.status),
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Submitted Claims & Approvals
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#24563E]" />
              <span>Fetching reimbursement records...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No reimbursement requests found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => {
                const isExpanded = expandedRequestId === req.id;
                const empName = req.first_name
                  ? `${req.first_name} ${req.last_name || ""}`
                  : "Self";

                return (
                  <div
                    key={req.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <div
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => toggleExpand(req.id)}
                    >
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <button className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <h3 className="text-xs font-semibold text-slate-900">
                            {req.title}
                          </h3>
                          <p className="text-[10px] text-slate-400">
                            {empName} • {req.items?.length || 0} Line Item(s)
                          </p>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        {req.currency || "INR"}{" "}
                        {Number(req.total_amount).toLocaleString("en-IN")}
                      </div>

                      <div className="hidden lg:flex items-center gap-2 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-medium ${
                            ["APPROVED", "Approved"].includes(
                              req.manager_status,
                            )
                              ? "bg-emerald-50 text-emerald-600"
                              : ["REJECTED", "Rejected"].includes(
                                    req.manager_status,
                                  )
                                ? "bg-rose-50 text-rose-600"
                                : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          Mgr: {req.manager_status}
                        </span>
                        <span>→</span>
                        <span
                          className={`px-2 py-0.5 rounded font-medium ${
                            ["APPROVED", "Approved"].includes(req.hr_status)
                              ? "bg-emerald-50 text-emerald-600"
                              : ["REJECTED", "Rejected"].includes(req.hr_status)
                                ? "bg-rose-50 text-rose-600"
                                : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          HR: {req.hr_status}
                        </span>
                        <span>→</span>
                        <span
                          className={`px-2 py-0.5 rounded font-medium ${
                            ["APPROVED", "DISBURSED", "Approved","Disbursed"].includes(
                              req.finance_status,
                            )
                              ? "bg-emerald-50 text-emerald-600"
                              : ["REJECTED", "Rejected"].includes(
                                    req.finance_status,
                                  )
                                ? "bg-rose-50 text-rose-600"
                                : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          Finance: {req.finance_status}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actionLoadingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#24563E]" />
                        ) : (
                          <>
                            {isManager && req.manager_status === "Pending" && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    handleApprovalAction(
                                      req.id,
                                      "manager",
                                      "Approved",
                                    )
                                  }
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleApprovalAction(
                                      req.id,
                                      "manager",
                                      "Rejected",
                                    )
                                  }
                                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {isHR &&
                              req.manager_status === "Approved" &&
                              req.hr_status === "Pending" && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() =>
                                      handleApprovalAction(
                                        req.id,
                                        "hr",
                                        "Approved",
                                      )
                                    }
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleApprovalAction(
                                        req.id,
                                        "hr",
                                        "Rejected",
                                      )
                                    }
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                            {isFinance &&
                              req.hr_status === "Approved" &&
                              req.finance_status === "Pending" && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() =>
                                      setDisburseModal({
                                        isOpen: true,
                                        requestId: req.id,
                                        txnRef: "",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-brand-50 text-[#24563E] hover:bg-brand-100 rounded-lg text-[11px] font-medium"
                                  >
                                    Disburse
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleApprovalAction(
                                        req.id,
                                        "finance",
                                        "Rejected",
                                      )
                                    }
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs space-y-4">
                        {req.description && (
                          <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-800">
                              Trip / Claim Summary:{" "}
                            </span>
                            {req.description}
                          </p>
                        )}

                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                              <tr>
                                <th className="p-3">Category</th>
                                <th className="p-3">Merchant</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Receipt</th>
                                <th className="p-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {req.items?.map((item) => (
                                <tr key={item.id}>
                                  <td className="p-3 font-medium text-slate-800">
                                    {item.category}
                                  </td>
                                  <td className="p-3 text-slate-600">
                                    {item.merchantName || "—"}
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {item.expenseDate || "—"}
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {item.description || "—"}
                                  </td>
                                  <td className="p-3">
                                    {item.receiptUrl ? (
                                      <a
                                        href={item.receiptUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#24563E] hover:underline flex items-center gap-1 font-medium"
                                      >
                                        View Receipt{" "}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 italic">
                                        None
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-semibold text-slate-800">
                                    {req.currency}{" "}
                                    {Number(item.amount).toLocaleString(
                                      "en-IN",
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden my-8 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Submit Reimbursement Claim
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">
                      Claim Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Client Visit to Mumbai"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#24563E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Trip Start Date
                    </label>
                    <input
                      type="date"
                      value={tripStartDate}
                      onChange={(e) => setTripStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#24563E] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Trip End Date
                    </label>
                    <input
                      type="date"
                      value={tripEndDate}
                      onChange={(e) => setTripEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#24563E] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">
                      Claim Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Purpose of trip or expense..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#24563E] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-semibold text-slate-800">
                      Expense Items
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-[#24563E] hover:underline flex items-center gap-1 font-medium text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">
                          Item #{idx + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-500 mb-1">
                            Category *
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "category",
                                e.target.value as ReimbursementCategory,
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="TRAVEL">Travel</option>
                            <option value="FUEL">Fuel</option>
                            <option value="STAY">Stay</option>
                            <option value="DINNER">Dinner</option>
                            <option value="TRAVEL_TICKET">Travel Ticket</option>
                            <option value="MISCELLANEOUS">Miscellaneous</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-500 mb-1">
                            Expense Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={item.expenseDate}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "expenseDate",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 mb-1">
                            Amount *
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Amount"
                            value={item.amount || ""}
                            onChange={(e) =>
                              handleItemChange(idx, "amount", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 mb-1">
                            Merchant *
                          </label>
                          <input
                            type="text"
                            placeholder="Merchant Name"
                            value={item.merchantName || ""}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "merchantName",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-slate-500 mb-1">
                            Receipt URL *
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://..."
                            value={item.receiptUrl}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "receiptUrl",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-3 bg-brand-50/50 rounded-xl border border-brand-100">
                  <span className="font-semibold text-slate-700">
                    Calculated Total:
                  </span>
                  <span className="font-bold text-[#24563E] text-sm">
                    {currency} {totalCalculated.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#24563E] hover:bg-brand-600 text-white rounded-xl font-medium flex items-center gap-2"
                  >
                    {submitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Submit Claim Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
