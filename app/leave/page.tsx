"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { DonutChart } from "../components/DonutChart";
import EmployeeLeaveTable from "../modals/EmployeeLeaveTable";
import AddLeaveModal from "../modals/AddLeaveModal";
import { useAuth } from "../context/AuthContext";

export default function LeavePage() {
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  
  const { token } = useAuth();
  const fetchLeaveData = useCallback(async () => {
    if (!token) return; 

    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/leave`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (json.data?.success || json.data?.data) {
        setLeaveData(json.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const totalRequests = leaveData.length;
  const pendingRequests = leaveData.filter((item) => item.status === "Pending" || item.status === "pending").length;
  const approvedRequests = leaveData.filter((item) => item.status === "Approved" || item.status === "approved").length;
  const rejectedRequests = leaveData.filter((item) => item.status === "Rejected" || item.status === "rejected").length;

  const stats = [
    {
      title: "Total Requests",
      value: totalRequests.toString(),
      total: totalRequests.toString(),
      percentage: 100,
      textColor: "text-blue-500",
      hexColor: "#3b82f6",
    },
    {
      title: "Approved Leaves",
      value: approvedRequests.toString(),
      total: totalRequests.toString(),
      percentage: totalRequests ? Math.round((approvedRequests / totalRequests) * 100) : 0,
      textColor: "text-emerald-500",
      hexColor: "#10b981",
    },
    {
      title: "Rejected Leaves",
      value: rejectedRequests.toString(),
      total: totalRequests.toString(),
      percentage: totalRequests ? Math.round((rejectedRequests / totalRequests) * 100) : 0,
      textColor: "text-rose-500",
      hexColor: "#f43f5e",
    },
    {
      title: "Pending Requests",
      value: pendingRequests.toString(),
      total: totalRequests.toString(),
      percentage: totalRequests ? Math.round((pendingRequests / totalRequests) * 100) : 0,
      textColor: "text-orange-500",
      hexColor: "#f97316",
    },
  ];

  const handleAddModal = () => {
    setIsLeaveModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leaves</h2>
          <p className="text-sm text-gray-500">Verify leaves over here...</p>
        </div>
        <button
          onClick={handleAddModal}
          className="flex items-center justify-center gap-2 bg-[#316AFF] hover:bg-[#2554d7] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Leave
        </button>
      </div>

      <AddLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={fetchLeaveData}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            onMouseEnter={() => setHoverIdx(index)}
            onMouseLeave={() => setHoverIdx(null)}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between transition-all"
            style={{
              borderWidth: hoverIdx === index ? "2px" : "1px",
              borderColor: hoverIdx === index ? stat.hexColor : "#e5e7eb",
            }}
          >
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-xs text-slate-400 font-medium">/{stat.total}</span>
              </div>
              <p className={`text-xs font-semibold mt-1 ${stat.textColor}`}>{stat.title}</p>
            </div>
            <DonutChart percentage={stat.percentage} color={stat.hexColor} />
          </div>
        ))}
      </div>

      <EmployeeLeaveTable
        data={leaveData}
        isLoading={isLoading}
        onRefresh={fetchLeaveData}
      />
    </div>
  );
}