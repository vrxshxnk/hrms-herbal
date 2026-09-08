"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Employee } from "../employee/page";
import { useAuth } from "../context/AuthContext";

type AddEmployeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
};

const initialFormState = {
  fullName: "",
  work_email: "",
  mobile_number: "",
  gender: "male",
  date_of_birth: "",
  marital_status: "single",
  joining_date: "",
  status: "active",
  department_id: "",
  designation_id: "",
};

type Department = {
  id: string;
  name: string;
  code: string;
};

type Designation = {
  id: string;
  title: string;
  code: string;
  department_id: string;
};

export const AddEmployeeModal = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
}: AddEmployeeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignation] = useState<Designation[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingDesignations, setLoadingDesignations] = useState(false);
  const { token } = useAuth();
  const isEditMode = Boolean(employeeToEdit);

  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await fetch("/api/v1/departments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        console.log("Result hai ", result);
        if (result.data.success && result.data.data) {
          setDepartments(result.data.data);
        }
      } catch (error) {
        console.log("Failed to load department", error);
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen || !token || !formData.department_id) {
      setDesignation([]);
      return;
    }
    const fetchDesignation = async () => {
      setLoadingDesignations(true);
      try {
        const res = await fetch(
          `/api/v1/designation?department_id=${formData.department_id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const result = await res.json();
        if (result.data.data && result.data.success) {
          setDesignation(result.data.data);
        }
        console.log("result", result);
      } catch (error) {
        console.log("Failed to load designations", error);
        setDesignation([]);
      } finally {
        setLoadingDesignations(false);
      }
    };
    fetchDesignation();
  }, [isOpen, token, formData.department_id]);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        fullName:
          employeeToEdit.display_name ||
          `${employeeToEdit.first_name} ${employeeToEdit.last_name}`,
        work_email: employeeToEdit.work_email || "",
        mobile_number: employeeToEdit.mobile_number || "",
        gender: employeeToEdit.gender || "male",
        date_of_birth: employeeToEdit.date_of_birth
          ? new Date(employeeToEdit.date_of_birth).toISOString().split("T")[0]
          : "",
        marital_status: employeeToEdit.marital_status || "single",
        joining_date: employeeToEdit.joining_date
          ? new Date(employeeToEdit.joining_date).toISOString().split("T")[0]
          : "",
        status: employeeToEdit.status || "active",
        department_id: employeeToEdit.department_id || "",
        designation_id: employeeToEdit.designation_id || "",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!token) {
      setErrorMsg("Authentication token missing. Please log in again.");
      setLoading(false);
      return;
    }
    const nameParts = formData.fullName.trim().split(" ");
    const first_name = nameParts[0] || "";
    const last_name =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "N/A";

    const payload = {
      employee_code: employeeToEdit
        ? employeeToEdit.employee_code
        : `EMP-${Date.now().toString().slice(-6)}`,
      first_name,
      last_name,
      display_name: formData.fullName,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth,
      marital_status: formData.marital_status,
      work_email: formData.work_email,
      mobile_number: formData.mobile_number,
      joining_date: formData.joining_date,
      status: formData.status,
      department_id: formData.department_id || null,
      designation_id: formData.designation_id || null,
      employment_type: "permanent",
      employee_category: "staff",
      preferred_language: "english",
    };

    try {
      const url = isEditMode
        ? `/api/v1/employee/${employeeToEdit?.id}`
        : "/api/v1/employee";
      const method = isEditMode ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && (result.meta?.success || result.success)) {
        setSuccessMsg(
          result.meta?.message ||
            `Employee ${isEditMode ? "updated" : "created"} successfully`,
        );
        await onSuccess();
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1200);
      } else {
        setErrorMsg(
          result.message ||
            `Failed to ${isEditMode ? "update" : "create"} employee`,
        );
      }
    } catch (err) {
      console.error("API error:", err);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {isEditMode ? "Edit Employee" : "Add Employee"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-medium">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#316AFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Work Email Address *
            </label>
            <input
              type="email"
              name="work_email"
              required
              placeholder="example@email.com"
              value={formData.work_email}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#316AFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Phone Number *
            </label>
            <input
              type="text"
              name="mobile_number"
              required
              placeholder="+919876543210"
              value={formData.mobile_number}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#316AFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Date of Birth *
              </label>
              <input
                type="date"
                name="date_of_birth"
                required
                value={formData.date_of_birth}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Marital Status *
              </label>
              <select
                name="marital_status"
                value={formData.marital_status}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF]"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Joining Date *
              </label>
              <input
                type="date"
                name="joining_date"
                required
                value={formData.joining_date}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Department
            </label>
            <select
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              disabled={loadingDepartments}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF] disabled:bg-slate-50"
            >
              <option value="">
                {loadingDepartments
                  ? "Loading departments..."
                  : "Select Department"}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Designation
            </label>
            <select
              name="designation_id"
              value={formData.designation_id}
              onChange={handleChange}
              disabled={!formData.department_id || loadingDesignations}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF] disabled:bg-slate-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!formData.department_id
                  ? "Select Department First"
                  : loadingDesignations
                    ? "Loading designations..."
                    : designations.length === 0
                      ? "No designations found"
                      : "Select Designation"}
              </option>
              {designations.map((desg) => (
                <option key={desg.id} value={desg.id}>
                  {desg.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Employment Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#316AFF]"
            >
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
              <option value="on_notice">On Notice</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#316AFF] hover:bg-[#2554d7] text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update Employee"
                  : "Save Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
