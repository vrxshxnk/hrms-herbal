"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Calendar,
  Layers,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Globe,
} from "lucide-react";

export interface EmployeeOption {
  id: string;
  display_name: string;
  department_name?: string;
}

export interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
}

interface AssignLeaveBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
  leaveTypes: LeaveTypeOption[];
  onSubmit?: (data: {
    employee_id: string;
    leave_type_id: string;
    year: number;
    total_leaves_avail: number;
    monthly_limit: number;
  }) => Promise<void> | void;
}

export const AssignLeaveBalanceModal: React.FC<
  AssignLeaveBalanceModalProps
> = ({ isOpen, onClose, employees = [], leaveTypes = [], onSubmit }) => {
  const currentYear = new Date().getFullYear();
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [year, setYear] = useState<number>(currentYear);
  const [totalLeaves, setTotalLeaves] = useState<number>(15.0);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(1.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !leaveTypeId) return;

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          year,
          total_leaves_avail: Number(totalLeaves),
          monthly_limit: Number(monthlyLimit),
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to allocate leave balance", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUniversalSelected = employeeId === "UNIVERSAL";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Set Employee Leave Balance
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Allocate yearly leave limits for hr management
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                {isUniversalSelected ? (
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#316AFF]" />
                )}
                Target Allocation <span className="text-rose-500">*</span>
              </span>

              {isUniversalSelected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  All Employees
                </span>
              )}
            </label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={`w-full h-10 px-3 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                isUniversalSelected
                  ? "border-indigo-300 bg-indigo-50/30 text-indigo-950 font-medium focus:ring-indigo-500/20 focus:border-indigo-500"
                  : "border-gray-200 text-gray-800 focus:ring-[#316AFF]/20 focus:border-[#316AFF]"
              }`}
            >
              <option value="">Select an employee or option...</option>
              {employees.map((emp) => (
                <option
                  key={emp.id}
                  value={emp.id}
                  className={
                    emp.id === "UNIVERSAL"
                      ? "font-bold text-indigo-700 bg-indigo-50"
                      : ""
                  }
                >
                  {emp.id === "UNIVERSAL"
                    ? `🌐 ${emp.display_name}`
                    : `${emp.display_name} ${emp.department_name ? `(${emp.department_name})` : ""}`}
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type & Year Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                Leave Type <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#316AFF]/20 focus:border-[#316AFF] text-gray-800"
              >
                <option value="">Select leave type...</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2035}
                className="w-full h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#316AFF]/20 focus:border-[#316AFF] text-gray-800"
              />
            </div>
          </div>

          {/* Allocation Settings */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200/60">
              <Sliders className="w-4 h-4 text-[#316AFF]" />
              Leave Allowance Controls
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Total Leaves Available
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="365"
                  value={totalLeaves}
                  onChange={(e) => setTotalLeaves(Number(e.target.value))}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#316AFF]/20 focus:border-[#316AFF] font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                  Monthly Limit
                  <span className="text-[10px] text-slate-400 font-normal">
                    Per Month
                  </span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="31"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#316AFF]/20 focus:border-[#316AFF] font-medium text-slate-800"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Default setup allows up to{" "}
              <strong className="text-slate-700">
                {monthlyLimit} days/month
              </strong>{" "}
              out of{" "}
              <strong className="text-slate-700">
                {totalLeaves} annual leaves
              </strong>
              .
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !employeeId || !leaveTypeId}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#316AFF] hover:bg-blue-600 rounded-xl transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Balance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
