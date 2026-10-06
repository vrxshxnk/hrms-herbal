"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {AssignLeaveBalanceModal,EmployeeOption,LeaveTypeOption} from "@/app/modals/AssignLeaveBalanceModal";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2 } from "lucide-react";

const UNIVERSAL_OPTION: EmployeeOption = {
  id: "UNIVERSAL",
  display_name: "ALL (Universal - Applies to Everyone)",
  department_name: "Global",
};

export default function AddLeavePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const requestOptions = {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        };
        const [empRes, leaveTypeRes] = await Promise.all([
          fetch(`/api/v1/employee?limit=1000&page=1`, requestOptions),
          fetch(`/api/v1/leave/types`, requestOptions),
        ]);
        if (!empRes.ok || !leaveTypeRes.ok) {
          throw new Error("Failed to load dropdown choices.");
        }
        const empData = await empRes.json();
        const leaveData = await leaveTypeRes.json();
        const rawEmployees: EmployeeOption[] = empData.data?.data || empData.data || [];
        const rawLeaveTypes: LeaveTypeOption[] = leaveData.data?.data || leaveData.data || [];
        
        setEmployees([UNIVERSAL_OPTION, ...rawEmployees]);
        setLeaveTypes(rawLeaveTypes);
      } catch (error: any) {
        console.error("Error loading modal options:", error);
        setError(error.message || "Failed to load options");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const handleSave = async (payload: {
    employee_id: string;
    leave_type_id: string;
    year: number;
    total_leaves_avail: number;
    monthly_limit: number;
  }) => {
    const res = await fetch("/api/v1/leave/balance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to allocate leave balance");
    }
    router.push("/leave");
  };

  const handleClose = () => {
    setIsOpen(false);
    router.push("/leave");
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-[#316AFF]" />
        <span className="text-sm">Loading options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-rose-600 text-sm">
        <p>{error}</p>
        <button
          onClick={handleClose}
          className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AssignLeaveBalanceModal
        isOpen={isOpen}
        onClose={handleClose}
        employees={employees}
        leaveTypes={leaveTypes}
        onSubmit={handleSave}
      />
    </div>
  );
}