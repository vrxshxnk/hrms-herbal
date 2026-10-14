"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, MessageSquareText, RotateCcw, Eye } from "lucide-react";
import { LeaveTrackModal, LeaveRequest } from "./LeaveTrackModal";

interface EmployeeLeaveTableProps {
  data: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function EmployeeLeaveTable({
  data = [],
  isLoading,
  onRefresh,
}: EmployeeLeaveTableProps) {
  const { user, roles, hasRole, token } = useAuth();

  const isHR =
    hasRole("hr") || roles.includes("hr") || user?.system_role?.toLowerCase() === "hr";
  const isManager =
    hasRole("manager") ||
    roles.includes("manager") ||
    user?.system_role?.toLowerCase() === "manager";
  const hasActionRole = isHR || isManager;

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [balanceMap, setBalanceMap] = useState<Record<string, any[]>>({});
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [viewingReason, setViewingReason] = useState<{
    name: string;
    reason: string;
  } | null>(null);

  // Leave Tracking Modal State
  const [trackingLeave, setTrackingLeave] = useState<LeaveRequest | null>(null);

  // Mouse Drag Scrolling Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    async function fetchBalances() {
      if (!token) return;
      try {
        const res = await fetch("/api/v1/leave/balance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        const rawData = result?.data?.data || result?.data || [];
        const map: Record<string, any[]> = {};

        if (Array.isArray(rawData)) {
          rawData.forEach((emp: any) => {
            if (emp.employee_id) {
              map[emp.employee_id] = emp.balances || [];
            }
          });
        }
        setBalanceMap(map);
      } catch (error) {
        console.error("Failed to fetch leave balances:", error);
      }
    }

    fetchBalances();
  }, [token, data]);

  const openRejectModal = (id: string) => {
    setRejectingLeaveId(id);
    setRejectionReasonInput("");
    setReasonError("");
  };

  const closeRejectModal = () => {
    setRejectingLeaveId(null);
    setRejectionReasonInput("");
    setReasonError("");
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: "Approved" | "Rejected" | "Withdrawn",
    reason?: string,
  ) => {
    if (!id) {
      console.error("Cannot update status: Invalid leave ID");
      return;
    }

    try {
      setUpdatingId(id);
      const res = await fetch(`/api/v1/leave/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          action: newStatus,
          approved_by: user?.sub,
          rejection_reason: newStatus === "Rejected" ? reason : null,
        }),
      });

      if (res.ok) {
        closeRejectModal();
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleWithdraw = async (id: string) => {
    if (!id) return;
    const confirmWithdraw = window.confirm(
      "Are you sure you want to withdraw this leave request?",
    );
    if (!confirmWithdraw) return;
    await handleStatusUpdate(id, "Withdrawn");
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReasonInput.trim()) {
      setReasonError("Please enter a reason for rejection.");
      return;
    }
    if (rejectingLeaveId) {
      handleStatusUpdate(
        rejectingLeaveId,
        "Rejected",
        rejectionReasonInput.trim(),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        Loading leave requests...
      </div>
    );
  }

  const formatDate = (datestring: string) => {
    if (!datestring) return "-";
    return new Date(datestring).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const getBalanceDisplay = (row: any) => {
    const empBalances = balanceMap[row.employee_id];
    if (!empBalances || empBalances.length === 0) return "-";

    const matched = empBalances.find(
      (b: any) =>
        b.leave_type_id === row.leave_type_id ||
        b.leave_type_name?.toLowerCase() === row.leave_type?.toLowerCase(),
    );

    if (!matched) {
      const defaultBal = empBalances[0];
      return `${defaultBal.remaining_leaves ?? "-"} / ${defaultBal.total_leaves_avail ?? "-"}`;
    }

    return `${matched.remaining_leaves} / ${matched.total_leaves_avail}`;
  };

  const visibleData = data.filter((row) => {
    if (isHR) {
      const managerStatus =
        row.manager_approval_status ?? (row.reporting_manager_id ? "Pending" : "N/A");
      return managerStatus === "Approved" || !row.reporting_manager_id;
    }
    return true;
  });

  return (
    <>
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Employee's Leave
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search..."
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
              Download Report
            </button>
            <select className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700">
              <option>2026</option>
              <option>2025</option>
            </select>
          </div>
        </div>

        {/* Scrollable Container with Mouse Drag & Wheel Support */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="w-full overflow-x-auto rounded-lg pb-3 cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-lg hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
        >
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="bg-blue-50/50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Leave Type</th>
                {isHR && (<th className="py-3 px-4">Department</th>)}
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Start</th>
                <th className="py-3 px-4">End</th>
                <th className="py-3 px-4 min-w-[180px]">Manager Approval</th>
                <th className="py-3 px-4 min-w-[180px]">HR Status</th>
                <th className="py-3 px-4 text-center min-w-[200px]">Action</th>
                <th className="py-3 px-4 text-center min-w-[200px]">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {visibleData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-gray-500">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                visibleData.map((row) => {
                  const leaveId = row.id || row.request_id;

                  const managerStatus =
                    row.manager_approval_status ??
                    (row.reporting_manager_id ? "Pending" : "N/A");

                  const isManagerApproved =
                    managerStatus === "Approved" || !row.reporting_manager_id;
                  const canHrApprove = isHR && isManagerApproved;

                  const rejectionReason =
                    row.rejection_reason || row.manager_rejection_reason;
                  
                  const isOwnRequest =
                    user?.sub === row.keycloak_id ||
                    user?.id === row.employee_id ||
                    (user?.email &&
                      user?.email?.toLowerCase() ===
                        row.employee_email?.toLowerCase());

                  const canWithdraw =
                    isOwnRequest &&
                    row.status !== "Withdrawn" &&
                    row.status !== "Rejected";

                  return (
                    <tr
                      key={leaveId}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              row.profile_photo_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                row.employee_name || "Employee",
                              )}`
                            }
                            alt={row.employee_name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <span>{row.employee_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-emerald-600 font-medium">
                        {row.leave_type}
                      </td>
                     {isHR && (
                         <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {row.department || "N/A"}
                      </td>
                     )}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
                          <span className="text-blue-600 font-bold">
                            {getBalanceDisplay(row).split("/")[0]?.trim()}
                          </span>
                          <span className="text-slate-400 font-normal">/</span>
                          <span className="text-slate-500">
                            {getBalanceDisplay(row).split("/")[1]?.trim()} Days
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {row.duration_display || `${row.total_days} Days`}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {formatDate(row.start_date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {formatDate(row.end_date)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              managerStatus === "Approved"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                                : managerStatus === "Rejected"
                                  ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                                  : managerStatus === "N/A"
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-amber-50 text-amber-600 border border-amber-200/60"
                            }`}
                          >
                            {managerStatus}
                          </span>
                          {managerStatus === "Rejected" && rejectionReason && (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingReason({
                                  name: row.employee_name || "Employee",
                                  reason: rejectionReason,
                                })
                              }
                              className="text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200/70 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Reason:</span>
                              <span className="max-w-[110px] truncate underline decoration-rose-300">
                                {rejectionReason}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              row.status === "Approved"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                                : row.status === "Rejected"
                                  ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                                  : row.status === "Withdrawn"
                                    ? "bg-slate-100 text-slate-600 border border-slate-200"
                                    : "bg-amber-50 text-amber-600 border border-amber-200/60"
                            }`}
                          >
                            {row.status}
                          </span>
                          {row.status === "Rejected" &&
                            rejectionReason &&
                            managerStatus !== "Rejected" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingReason({
                                    name: row.employee_name || "Employee",
                                    reason: rejectionReason,
                                  })
                                }
                                className="text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200/70 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Reason:</span>
                                <span className="max-w-[110px] truncate underline decoration-rose-300">
                                  {rejectionReason}
                                </span>
                              </button>
                            )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                        {hasActionRole && !isOwnRequest && (
                            <>
                              {row.status !== "Approved" && row.status !== "Withdrawn" && (
                                <button
                                  disabled={
                                    updatingId === leaveId ||
                                    (isHR && !canHrApprove)
                                  }
                                  title={
                                    isHR && !canHrApprove
                                      ? "Waiting for Manager Approval first"
                                      : ""
                                  }
                                  onClick={() =>
                                    handleStatusUpdate(leaveId, "Approved")
                                  }
                                  className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Approve
                                </button>
                              )}
                              {row.status !== "Rejected" && row.status !== "Withdrawn" && (
                                <button
                                  disabled={updatingId === leaveId}
                                  onClick={() => openRejectModal(leaveId)}
                                  className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          )}

                          {canWithdraw && (
                            <button
                              disabled={updatingId === leaveId}
                              onClick={() => handleWithdraw(leaveId)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Withdraw leave request"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                         <div className="flex items-center justify-center gap-2">
                            <button
                            type="button"
                            onClick={() => setTrackingLeave(row)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center gap-1"
                            title="View tracking history"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            History
                          </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm text-gray-500">
          <span>Showing 1 to {visibleData.length} entries</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 rounded border bg-blue-600 text-white font-medium">
              1
            </button>
          </div>
        </div>
      </div>

      <LeaveTrackModal
        isOpen={!!trackingLeave}
        onClose={() => setTrackingLeave(null)}
        leave={trackingLeave}
      />

      {viewingReason && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Rejection Reason
                </h3>
                <p className="text-xs text-gray-500">
                  Employee:{" "}
                  <span className="font-medium text-gray-700">
                    {viewingReason.name}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReason(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-4 my-2 text-sm text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
              {viewingReason.reason}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setViewingReason(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectingLeaveId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Reject Leave Request
              </h3>
              <button
                type="button"
                onClick={closeRejectModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <MessageSquareText className="w-4 h-4 text-rose-500" />
                    Reason for Rejection
                    <span className="text-rose-500">*</span>
                  </label>
                </div>

                <div className="relative rounded-lg shadow-xs">
                  <textarea
                    rows={3}
                    value={rejectionReasonInput}
                    onChange={(e) => {
                      setRejectionReasonInput(e.target.value);
                      if (reasonError) setReasonError("");
                    }}
                    placeholder="Explain why this request is being rejected..."
                    className={`w-full text-sm p-3 rounded-lg border transition-colors resize-none focus:outline-none ${
                      reasonError
                        ? "border-rose-300 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        : "border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    }`}
                    autoFocus
                  />
                </div>

                {reasonError && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    {reasonError}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === rejectingLeaveId}
                  className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {updatingId === rejectingLeaveId
                    ? "Rejecting..."
                    : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}