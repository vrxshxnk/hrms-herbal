"use client";

import React from "react";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building2,
  Calendar,
  FileText,
  RotateCcw,
  MessageSquare,
  User,
  Tag,
} from "lucide-react";

export interface LeaveRequest {
  id?: string;
  request_id?: string;
  employee_id?: string;
  employee_name?: string;
  leave_type?: string;
  leave_type_name?: string;
  department?: string;
  start_date: string;
  end_date: string;
  total_days?: string | number;
  duration_display?: string;
  half_day_type?: string;
  status: "Pending" | "Approved" | "Rejected" | "Withdrawn" | string;
  reason?: string;
  rejection_reason?: string | null;
  manager_rejection_reason?: string | null;
  approved_by?: string | null;
  action_taken_at?: string | null;
  created_at?: string;
  updated_at?: string;
  manager_approval_status?: "Pending" | "Approved" | "Rejected" | "N/A" | string;
  manager_approved_by?: string | null;
  manager_action_at?: string | null;
  reporting_manager_id?: string | null;
}

interface LeaveTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: LeaveRequest | null;
}

export const LeaveTrackModal: React.FC<LeaveTrackModalProps> = ({
  isOpen,
  onClose,
  leave,
}) => {
  if (!isOpen || !leave) return null;

  const leaveId = leave.id || leave.request_id || "N/A";
  const applicationReason = leave.reason || "No reason provided.";
  const rejectionReason = leave.rejection_reason || leave.manager_rejection_reason;
  
  const managerStatus =
    leave.manager_approval_status ??
    (leave.reporting_manager_id ? "Pending" : "N/A");

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  };

  const getBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Rejected
          </span>
        );
      case "Withdrawn":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Withdrawn
          </span>
        );
      case "N/A":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            Skipped (Direct)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case "Rejected":
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case "Withdrawn":
        return <RotateCcw className="w-5 h-5 text-slate-600" />;
      case "Created":
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Leave Request Tracking
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Request ID: <span className="font-mono text-gray-700 font-medium">{leaveId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Detailed Request Summary Card */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="truncate">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Applicant</span>
                  <span className="font-medium text-gray-800 truncate block">
                    {leave.employee_name || "Employee"}
                  </span>
                  <span className="text-gray-500 text-[11px] block">{leave.department || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Leave Type & Duration</span>
                  <span className="font-semibold text-gray-800">
                    {leave.leave_type || leave.leave_type_name || "Leave"}
                  </span>
                  <span className="text-emerald-700 font-medium text-[11px] block">
                    {leave.duration_display || `${leave.total_days || "-"} Days`}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason Box */}
            <div className="pt-2.5 border-t border-gray-200/60 flex items-start gap-2 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-500 font-medium">Applied Reason: </span>
                <span className="text-gray-700 italic">"{applicationReason}"</span>
              </div>
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
            
            {/* Step 1: Created / Submitted */}
            <div className="relative flex gap-4">
              <div className="absolute -left-[29px] top-0 bg-white p-1 rounded-full border border-gray-200 shadow-xs">
                {getStepIcon("Created")}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Request Submitted
                  </h4>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {formatDate(leave.created_at) || "Submitted"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Leave application submitted by employee into workflow.
                </p>
              </div>
            </div>

            {/* Step 2: Manager Review */}
            <div className="relative flex gap-4">
              <div className="absolute -left-[29px] top-0 bg-white p-1 rounded-full border border-gray-200 shadow-xs">
                {getStepIcon(managerStatus)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Manager Approval
                    </h4>
                  </div>
                  {getBadge(managerStatus)}
                </div>

                <div className="mt-2 text-xs">
                  {managerStatus === "Approved" && (
                    <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-lg space-y-1 text-emerald-900">
                      <p className="font-medium text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Approved by Manager
                      </p>
                      {leave.manager_action_at && (
                        <div className="flex justify-between text-[11px] text-emerald-700 pt-0.5">
                          <span>Action Date:</span>
                          <span className="font-mono">{formatDate(leave.manager_action_at)}</span>
                        </div>
                      )}
                      {leave.manager_approved_by && (
                        <div className="flex justify-between text-[11px] text-emerald-700">
                          <span>Approver ID:</span>
                          <span className="font-mono truncate max-w-[160px]">
                            {leave.manager_approved_by}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {managerStatus === "Rejected" && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg space-y-1 text-rose-900">
                      <p className="font-semibold text-rose-800 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Rejected by Manager
                      </p>
                      {rejectionReason && (
                        <div className="mt-1 pt-1 border-t border-rose-200/60">
                          <span className="text-[11px] font-medium text-rose-700 block">
                            Rejection Reason:
                          </span>
                          <p className="text-rose-900 mt-0.5 font-normal bg-white/70 p-2 rounded border border-rose-100">
                            {rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {managerStatus === "Pending" && (
                    <p className="text-xs text-amber-700 bg-amber-50/60 border border-amber-100 p-2.5 rounded-lg italic">
                      Awaiting review from reporting manager...
                    </p>
                  )}

                  {managerStatus === "N/A" && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg italic">
                      Direct reporting (Manager review skipped).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: HR Final Action */}
            <div className="relative flex gap-4">
              <div className="absolute -left-[29px] top-0 bg-white p-1 rounded-full border border-gray-200 shadow-xs">
                {getStepIcon(leave.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      HR Decision
                    </h4>
                  </div>
                  {getBadge(leave.status)}
                </div>

                <div className="mt-2 text-xs">
                  {leave.status === "Approved" && (
                    <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-lg space-y-1 text-emerald-900">
                      <p className="font-medium text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Approved by HR
                      </p>
                      {(leave.action_taken_at || leave.updated_at) && (
                        <div className="flex justify-between text-[11px] text-emerald-700 pt-0.5">
                          <span>Action Date:</span>
                          <span className="font-mono">
                            {formatDate(leave.action_taken_at || leave.updated_at)}
                          </span>
                        </div>
                      )}
                      {leave.approved_by && (
                        <div className="flex justify-between text-[11px] text-emerald-700">
                          <span>HR Handler ID:</span>
                          <span className="font-mono truncate max-w-[160px]">
                            {leave.approved_by}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {leave.status === "Rejected" && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg space-y-1 text-rose-900">
                      <p className="font-semibold text-rose-800 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Rejected by HR
                      </p>
                      {(leave.action_taken_at || leave.updated_at) && (
                        <div className="flex justify-between text-[11px] text-rose-700 pt-0.5">
                          <span>Action Date:</span>
                          <span className="font-mono">
                            {formatDate(leave.action_taken_at || leave.updated_at)}
                          </span>
                        </div>
                      )}
                      {rejectionReason && managerStatus !== "Rejected" && (
                        <div className="mt-1 pt-1 border-t border-rose-200/60">
                          <span className="text-[11px] font-medium text-rose-700 block">
                            Rejection Reason:
                          </span>
                          <p className="text-rose-900 mt-0.5 font-normal bg-white/70 p-2 rounded border border-rose-100">
                            {rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {leave.status === "Withdrawn" && (
                    <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg text-slate-700">
                      <p className="font-medium flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        Application Withdrawn by Employee
                      </p>
                    </div>
                  )}

                  {leave.status === "Pending" && (
                    <p className="text-xs text-amber-700 bg-amber-50/60 border border-amber-100 p-2.5 rounded-lg italic">
                      {managerStatus === "Rejected"
                        ? "Halted (Manager Rejected)"
                        : "Awaiting final HR verification..."}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};