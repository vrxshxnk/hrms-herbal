"use client";
import { Sun, Moon, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

type AddLeaveModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

interface EmployeeOption {
  id: string;
  display_name: string;
  employee_code: string;
}

const LEAVE_TYPES = [
  { code: "CASUAL", name: "Casual Leave" },
  { code: "SICK", name: "Sick Leave" },
  { code: "MATERNITY", name: "Maternity Leave" },
  { code: "PATERNITY", name: "Paternity Leave" },
  { code: "HALF_DAY", name: "Half Day Leave" },
];

const AddLeaveModal = ({ isOpen, onClose, onSuccess }: AddLeaveModalProps) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [leaveCode, setLeaveCode] = useState<string>("");
  const [halfDayType, setHalfDayType] = useState<"full_day" | "first_half" | "second_half">("first_half");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<string>("Pending");
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { token, hasRole, dbUser } = useAuth();

  const isHr = ["hr", "hr_admin", "hradmin", "admin", "system_admin"].some(hasRole);
  const isManager = hasRole("manager") || hasRole("super_manager");
  const isHrOrManager = isHr || isManager;

  // Check if applying for self
  const isApplyingForSelf = !selectedEmployeeId || selectedEmployeeId === dbUser?.id;
  useEffect(() => {
    if (isApplyingForSelf) {
      setStatus("Pending");
    } else {
      setStatus("Approved");
    }
  }, [selectedEmployeeId, isApplyingForSelf]);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    if (leaveCode === "HALF_DAY") return 0.5;
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    if (end < start) return 0;
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }, [startDate, endDate, leaveCode]);

  useEffect(() => {
    if (leaveCode === "HALF_DAY" && startDate) {
      setEndDate(startDate);
    }
  }, [leaveCode, startDate]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    if (!isHrOrManager) {
      setSelectedEmployeeId(dbUser?.id || "");
      return;
    }

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const loadPage = async (page: number) => {
          const res = await fetch(`/api/v1/employee?status=active&limit=100&page=${page}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Failed to load employees");
          const json = await res.json();
          return json.data;
        };
        const firstPage = await loadPage(1);
        const totalPages = Math.max(1, Number(firstPage?.meta?.totalPages) || 1);
        const otherPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) => loadPage(index + 2)),
        );
        setEmployees([...(firstPage?.data || []), ...otherPages.flatMap((page) => page?.data || [])]);

        // Default select current user in dropdown if available
        if (dbUser?.id) {
          setSelectedEmployeeId(dbUser.id);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [isOpen, token, isHrOrManager, dbUser]);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedEmployeeId(dbUser?.id || "");
    setLeaveCode("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setStatus("Pending");
    setHalfDayType("first_half");
    setErrorMessage(null);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (totalDays <= 0) {
      setErrorMessage("End date cannot be earlier than start date.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        employee_id: selectedEmployeeId || undefined,
        leave_code: leaveCode,
        start_date: startDate,
        end_date: leaveCode === "HALF_DAY" ? startDate : endDate,
        total_days: totalDays,
        half_day_type: leaveCode === "HALF_DAY" ? halfDayType : "full_day",
        status: isHrOrManager && !isApplyingForSelf ? status : "Pending",
        reason: reason.trim() || null,
      };

      const res = await fetch("/api/v1/leave", {
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
          result.error?.message || result.message || "Failed to add leave request"
        );
      }
      resetForm();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            Add Leave Request
          </h2>
          <button
            type="button"
            onClick={handleModalClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Employee *
            </label>

            {isHrOrManager ? (
              <select
                name="employee_id"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                required
                disabled={loadingEmployees || submitting}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#24563E] disabled:bg-slate-50"
              >
                <option value="" disabled>
                  {loadingEmployees
                    ? "Loading employees..."
                    : "Select an employee"}
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.display_name} ({emp.employee_code})
                    {emp.id === dbUser?.id ? " (You)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200/80 rounded-xl text-sm text-slate-600 flex items-center justify-between cursor-not-allowed">
                <span className="capitalize font-medium">
                  {dbUser?.display_name ||
                    (dbUser?.first_name && dbUser?.last_name
                      ? `${dbUser.first_name} ${dbUser.last_name}`
                      : dbUser?.first_name || "Loading...")}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({dbUser?.employee_code || "EMP"})
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Leave Type *
            </label>
            <select
              name="leave_code"
              value={leaveCode}
              onChange={(e) => setLeaveCode(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#24563E] disabled:bg-slate-50"
            >
              <option value="" disabled>
                Select leave type
              </option>
              {LEAVE_TYPES.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>

            {leaveCode === "HALF_DAY" && (
              <div className="p-3 bg-slate-50 mt-2 border border-slate-200/80 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-500 tracking-wider">
                  Half Day Shift *
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setHalfDayType("first_half")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      halfDayType === "first_half"
                        ? "border-[#24563E] bg-brand-50 text-[#24563E] shadow-sm font-medium"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg ${halfDayType === "first_half" ? "bg-[#24563E] text-white" : "bg-amber-100 text-amber-600"}`}
                    >
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-none">
                        First Half
                      </span>
                      <span
                        className={`text-[10px] mt-0.5 ${halfDayType === "first_half" ? "text-brand-700" : "text-slate-400"}`}
                      >
                        Morning
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHalfDayType("second_half")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      halfDayType === "second_half"
                        ? "border-[#24563E] bg-brand-50 text-[#24563E] shadow-sm font-medium"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg ${
                        halfDayType === "second_half"
                          ? "bg-[#24563E] text-white"
                          : "bg-brand-100 text-brand-600"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-none">
                        Second Half
                      </span>
                      <span
                        className={`text-[10px] mt-0.5 ${halfDayType === "second_half" ? "text-brand-700" : "text-slate-400"}`}
                      >
                        Afternoon
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#24563E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                name="end_date"
                value={leaveCode === "HALF_DAY" ? startDate : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={submitting || leaveCode === "HALF_DAY"}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#24563E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Total Days
            </label>
            <input
              type="number"
              name="total_days"
              value={totalDays}
              readOnly
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Reason
            </label>
            <textarea
              name="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              placeholder="Enter leave reason"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#24563E] resize-none"
            />
          </div>

          {/* Status Field: Shows only when applying for others, defaulting to Approved */}
          {isHrOrManager && !isApplyingForSelf && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Status *
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#24563E]"
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#24563E] hover:bg-[#1B4330] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting ? "Submitting..." : "Submit Leave"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeaveModal;
