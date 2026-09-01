"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";

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
];

const AddLeaveModal = ({ isOpen, onClose, onSuccess }: AddLeaveModalProps) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [leaveCode, setLeaveCode] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<string>("Pending");
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  }, [startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);


    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch("/api/v1/employee?status=active");
        const json = await res.json();
        if (json.data?.data) {
          setEmployees(json.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedEmployeeId("");
    setLeaveCode("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setStatus("Pending");
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
        employee_id: selectedEmployeeId,
        leave_code: leaveCode,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        half_day_type: "full_day",
        status: status,
        reason: reason.trim() || null,
      };
      const res = await fetch("/api/v1/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || result.message || "Failed to add leave request");
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
          <h2 className="text-lg font-bold text-slate-800">Add Leave Request</h2>
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
            <select
              name="employee_id"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              required
              disabled={loadingEmployees || submitting}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#10b981] disabled:bg-slate-50"
            >
              <option value="" disabled>
                {loadingEmployees ? "Loading employees..." : "Select an employee"}
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.display_name} ({emp.employee_code})
                </option>
              ))}
            </select>
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
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#10b981] disabled:bg-slate-50"
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
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                name="end_date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#10b981]"
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
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#10b981] resize-none"
            />
          </div>


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
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#10b981]"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

       
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
              className="bg-[#10b981] hover:bg-[#0d9e6e] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
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