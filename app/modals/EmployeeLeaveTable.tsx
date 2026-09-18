"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

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
  
  const isHR = hasRole("hr") || roles.includes("hr") || user?.system_role?.toLowerCase() === "hr";
  const isManager = hasRole("manager") || roles.includes("manager") || user?.system_role?.toLowerCase() === "manager";
  const hasActionRole = isHR || isManager;

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [balanceMap, setBalanceMap] = useState<Record<string, any[]>>({});

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

  const handleStatusUpdate = async (
    id: string,
    newStatus: "Approved" | "Rejected",
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
          rejection_reason:
            newStatus === "Rejected" ? "Rejected during review process" : null,
        }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingId(null);
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
        b.leave_type_name?.toLowerCase() === row.leave_type?.toLowerCase()
    );

    if (!matched) {
      const defaultBal = empBalances[0];
      return `${defaultBal.remaining_leaves ?? "-"} / ${defaultBal.total_leaves_avail ?? "-"}`;
    }

    return `${matched.remaining_leaves} / ${matched.total_leaves_avail}`;
  };

  return (
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

      <div className="w-full overflow-x-auto rounded-lg">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-blue-50/50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Leave Type</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Balance</th>
              <th className="py-3 px-4">Days</th>
              <th className="py-3 px-4">Start</th>
              <th className="py-3 px-4">End</th>
              <th className="py-3 px-4">Manager Approval</th>
              <th className="py-3 px-4">HR Status</th>
              {hasActionRole && (
                <th className="py-3 px-4 text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-500">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              data.map((row) => {
                console.log("row",row);
                // Fix 1: Normalize leave ID across backend key names
                const leaveId = row.id || row.request_id;

                // Fix 2: Priority given to row.manager_approval_status
                const managerStatus = 
                  row.manager_approval_status ?? 
                  (row.reporting_manager_id ? "Pending" : "N/A");

                const isManagerApproved = managerStatus === "Approved" || !row.reporting_manager_id;
                const canHrApprove = isHR && isManagerApproved;

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
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                      {row.department || "N/A"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
                        <span className="text-blue-600 font-bold">
                          {getBalanceDisplay(row).split('/')[0]?.trim()}
                        </span>
                        <span className="text-slate-400 font-normal">/</span>
                        <span className="text-slate-500">
                          {getBalanceDisplay(row).split('/')[1]?.trim()} Days
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

                    {/* MANAGER APPROVAL COLUMN */}
                    <td className="py-3 px-4 whitespace-nowrap">
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
                    </td>

                    {/* HR STATUS COLUMN */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          row.status === "Approved"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            : row.status === "Rejected"
                              ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                              : "bg-amber-50 text-amber-600 border border-amber-200/60"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* ACTION BUTTONS */}
                    {hasActionRole && (
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {row.status !== "Approved" && (
                            <button
                              disabled={updatingId === leaveId || (isHR && !canHrApprove)}
                              title={
                                isHR && !canHrApprove
                                  ? "Waiting for Manager Approval first"
                                  : ""
                              }
                              onClick={() => handleStatusUpdate(leaveId, "Approved")}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Approve
                            </button>
                          )}
                          {row.status !== "Rejected" && (
                            <button
                              disabled={updatingId === leaveId}
                              onClick={() => handleStatusUpdate(leaveId, "Rejected")}
                              className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm text-gray-500">
        <span>Showing 1 to {data.length} entries</span>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1 rounded border bg-blue-600 text-white font-medium">
            1
          </button>
        </div>
      </div>
    </div>
  );
}