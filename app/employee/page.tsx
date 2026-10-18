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
  Upload,
} from "lucide-react";
import { AddEmployeeModal } from "../modals/AddEmployeeModal";
import { TempPasswordModal } from "../modals/TempPasswordModal";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

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
  reporting_manager_id?: string | null;
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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const [createdCredentials, setCreatedCredentials] = useState<(Employee & { temporary_password?: string }) | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen]= useState(false);

  const { roles, token } = useAuth();
  const hasHrRole = ["hr", "hr_admin", "hradmin", "admin", "system_admin"].some((role) => roles.includes(role));

  const fetchEmployees = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("status", activeTab === "employee" ? "active" : "on_leave");

      const response = await fetch(`/api/v1/employee?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
  }, [search, activeTab, token]);

  const handleModalSuccess = async(createdData?: Employee & { temporary_password?: string })=>{
     await fetchEmployees();
     if(createdData?.temporary_password){
       setCreatedCredentials(createdData);
       setIsPasswordModalOpen(true);
     }
  }

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

  const handleDeleteEmp = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;
    try {
      const res = await fetch(`/api/v1/employee/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to deactivate employee");
      }
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (error: unknown) {
      console.error("Error deleting employee:", error);
      alert(error instanceof Error ? error.message : "An error occurred while deactivating the employee.");
    }
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
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">
            People directory <span className="ml-2 text-sm font-medium text-slate-500">{total} people</span>
          </h1>
          <p className="text-xs text-slate-500 mt-2">The people behind your organization. Find details, manage records, and stay connected.</p>
        </div>

        {hasHrRole && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="button-primary shrink-0 self-start whitespace-nowrap sm:self-center"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Add employee
          </button>
        )}
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        employeeToEdit={selectedEmployee}
      />
      <TempPasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={()=>setIsPasswordModalOpen(false)}
        data={createdCredentials}
      />

      <div className="bg-white rounded-2xl p-3 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 border-b md:border-b-0 border-slate-100 px-2 pb-2 md:pb-0">
          <Link
            href="/employee"
            className={`text-sm font-semibold relative pb-2 md:pb-0 transition-colors ${
              activeTab === "employee"
                ? "text-[#24563E]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Employee
            {activeTab === "employee" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#24563E] rounded-full" />
            )}
          </Link>
          <Link
            href="/leave"
            onClick={() => setActiveTab("leave")}
            className={`text-sm font-semibold relative pb-2 md:pb-0 transition-colors ${
              activeTab === "leave"
                ? "text-[#24563E]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Leave Request
            {activeTab === "leave" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#24563E] rounded-full" />
            )}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border-r border-slate-200 pr-3 gap-1">
            <button
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "text-[#24563E] bg-slate-50"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "text-[#24563E] bg-slate-50"
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
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#24563E]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#24563E]" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500 font-medium">No employees found</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>{["Employee", "Employee code", "Department", "Status", "Actions"].map(label => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{employees.map(emp => <tr key={emp.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-4"><p className="font-semibold">{emp.display_name || `${emp.first_name} ${emp.last_name}`}</p><p className="text-slate-500 mt-1">{emp.work_email}</p></td>
              <td className="px-5 py-4 font-mono">{emp.employee_code}</td>
              <td className="px-5 py-4">{emp.department_name || "Not assigned"}</td>
              <td className="px-5 py-4 capitalize">{emp.status}</td>
              <td className="px-5 py-4"><div className="flex gap-4"><Link className="text-brand-600 font-semibold" href={`/docs/${emp.id}?name=${encodeURIComponent(emp.display_name || emp.first_name + " " + emp.last_name)}`}>Documents</Link>{hasHrRole && <><button className="text-brand-600 font-semibold" onClick={() => handleOpenEditModal(emp)}>Edit</button><button className="text-rose-600" onClick={() => handleDeleteEmp(emp.id)}>Delete</button></>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {employees.map((emp) => {
            return (
              <div
                key={emp.id}
                className="bg-white rounded-xl border border-slate-200 flex flex-col justify-between"
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
                        aria-label={`Actions for ${emp.first_name} ${emp.last_name}`}
                        onClick={() =>
                          setOpenMenuId((prev) =>
                            prev === emp.id ? null : emp.id,
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
                              handleDeleteEmp(emp.id);
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

                  {emp.profile_photo_url ? <img src={emp.profile_photo_url} alt={emp.first_name} className="w-16 h-16 rounded-full object-cover mx-auto" /> : <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-brand-50 text-brand-600 text-xl font-medium" aria-hidden="true">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>}

                  <h3 className="text-base font-bold text-slate-900 mt-3">
                    {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                  </h3>
                  <p className="text-xs text-[#24563E] font-medium">
                    {emp.designation_title || "Employee"}
                  </p>
                  <p className="mt-2 text-[10px] font-mono text-slate-500">{emp.employee_code}</p>
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
                      <Mail className="w-3.5 h-3.5 text-[#24563E]" />
                      <span className="truncate">{emp.work_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#24563E]" />
                      <span>{emp.mobile_number}</span>
                    </div>

                    <div className="p-4 bg-white/60 rounded-b-2xl border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/docs/${emp.id}?name=${encodeURIComponent(
                          emp.display_name ||
                            `${emp.first_name}${emp.last_name}`,
                        )}`}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-brand-50 text-[#24563E] border border-brand-200 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:border-brand-400 group"
                      >
                        <Upload className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span>Upload Docs</span>
                      </Link>
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
