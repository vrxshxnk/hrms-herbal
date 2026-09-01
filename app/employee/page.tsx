"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import { AddEmployeeModal } from "../modals/AddEmployeeModal";
import Link from "next/link";

export type Employee = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_photo_url?: string;
  work_email: string;
  mobile_number: string;
  status: string;
  joining_date: string;
  gender?: string;
  date_of_birth?: string;
  marital_status?: string;
  department_id?: string;
  designation_id?: string;
  department_name?: string;
  designation_title?: string;
};

const EmployeePage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"employee" | "leave">("employee");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("status", activeTab === "employee" ? "active" : "on_leave");

      const response = await fetch(`/api/v1/employee?${params.toString()}`);
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        return;
      }
      const json = await response.json();
      const result = json.data;
      if (result?.success) {
        setEmployees(result.data || []);
        setTotal(result.meta?.total || (json.data ? json.data.length : 0));
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  const cardStyles = [
    "bg-blue-50/50 border-blue-100",
    "bg-purple-50/50 border-purple-100",
    "bg-emerald-50/50 border-emerald-100",
    "bg-amber-50/50 border-amber-100",
    "bg-rose-50/50 border-rose-100",
    "bg-indigo-50/50 border-indigo-100",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    console.log("emp m hu :", emp);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {openMenuId !== null && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setOpenMenuId(null)}
        />
      )}

   
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            <span className="text-[#316AFF]">{total}</span> Employee
          </h1>
          <nav className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-500 font-medium">Employee</span>
          </nav>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-[#316AFF] hover:bg-[#2554d7] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEmployees}
        employeeToEdit={selectedEmployee}
      />

      <div className="bg-white rounded-2xl p-3 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 border-b md:border-b-0 border-slate-100 px-2 pb-2 md:pb-0">
          <Link
            href="/employee"
            className={`text-sm font-semibold relative pb-2 md:pb-0 transition-colors ${
              activeTab === "employee"
                ? "text-[#316AFF]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Employee
            {activeTab === "employee" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#316AFF] rounded-full" />
            )}
          </Link>
          <Link
            href="/leave"
            onClick={() => setActiveTab("leave")}
            className={`text-sm font-semibold relative pb-2 md:pb-0 transition-colors ${
              activeTab === "leave"
                ? "text-[#316AFF]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Leave Request
            {activeTab === "leave" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#316AFF] rounded-full" />
            )}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border-r border-slate-200 pr-3 gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "text-[#316AFF] bg-slate-50"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "text-[#316AFF] bg-slate-50"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Employee"
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#316AFF]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#316AFF]" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500 font-medium">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {employees.map((emp, index) => {
            const cardStyle = cardStyles[index % cardStyles.length];
            return (
              <div
                key={emp.id}
                className={`${cardStyle} rounded-2xl border border-slate-100 flex flex-col justify-between`}
              >
                <div className="p-5 text-center">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md capitalize ${
                        emp.status === "active"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {emp.status}
                    </span>

                    <div className="relative z-50">
                      <button
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === emp.id ? null : emp.id
                          )
                        }
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openMenuId === emp.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1 text-left">
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="w-full px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              console.log("Delete employee:", emp.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <img
                    src={
                      emp.profile_photo_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.first_name}`
                    }
                    alt={emp.first_name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-sm"
                  />

                  <h3 className="text-base font-bold text-slate-900 mt-3">
                    {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                  </h3>
                  <p className="text-xs text-[#316AFF] font-medium">
                    {emp.designation_title || "Employee"}
                  </p>
                </div>

                <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-3 rounded-b-2xl">
                  <div className="flex justify-between items-center text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Department</span>
                      <span className="font-semibold text-slate-700">
                        {emp.department_name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Hired Date</span>
                      <span className="font-semibold text-slate-700">
                        {formatDate(emp.joining_date)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#316AFF]" />
                      <span className="truncate">{emp.work_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#316AFF]" />
                      <span>{emp.mobile_number}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeePage;