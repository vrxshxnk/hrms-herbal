"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  Camera,
} from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "organization">(
    "personal",
  );

  const [formData, setFormData] = useState({
    display_name: "",
    personal_email: "",
    mobile_number: "",
    alternate_mobile: "",
    current_address: "",
    permanent_address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    marital_status: "",
    nationality: "",
    preferred_language: "",
    profile_photo_url: "",
  });

  useEffect(() => {
    if (!isOpen || !token) return;

    async function fetchProfile() {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch("/api/v1/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        const data = result?.data?.data || result?.data;
        if (data) {
          setProfile(data);
          setFormData({
            display_name: data.display_name || "",
            personal_email: data.personal_email || "",
            mobile_number: data.mobile_number || "",
            alternate_mobile: data.alternate_mobile || "",
            current_address: data.current_address || "",
            permanent_address: data.permanent_address || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            postal_code: data.postal_code || "",
            marital_status: data.marital_status || "",
            nationality: data.nationality || "",
            preferred_language: data.preferred_language || "english",
            profile_photo_url: data.profile_photo_url || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (message) setMessage(null);
  };

  // Image File Handler (Converts image to Base64 so it can be previewed and saved instantly)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 2MB." });
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData((prev) => ({ ...prev, profile_photo_url: base64String }));
      setUploadingImage(false);
    };
    reader.onerror = () => {
      setUploadingImage(false);
      setMessage({ type: "error", text: "Failed to read image file." });
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        const updatedData = result?.data?.data || result?.data;
        setProfile(updatedData || profile);
        setMessage({
          type: "success",
          text: "Profile updated successfully!",
        });

        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setMessage({
          type: "error",
          text: result?.error?.message || "Failed to update profile.",
        });
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const firstName = profile?.first_name || "User";
  const lastName = profile?.last_name || "";
  const fullName = formData.display_name || profile?.display_name || `${firstName} ${lastName}`.trim();
  
  // Display active uploaded photo or fallback to Dicebear avatar
  const avatarUrl =
    formData.profile_photo_url ||
    profile?.profile_photo_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Profile Summary */}
        <div className="relative bg-gradient-to-br from-[#F4F7FF] via-white to-[#FFF7F0] p-6 border-b border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-pulse">
              <div className="w-20 h-20 rounded-2xl bg-slate-200/80 shrink-0" />
              <div className="flex-1 w-full space-y-2.5 pt-1">
                <div className="h-5 w-2/5 rounded-md bg-slate-200/80 mx-auto sm:mx-0" />
                <div className="h-3 w-3/5 rounded-md bg-slate-200/70 mx-auto sm:mx-0" />
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <div className="h-6 w-40 rounded-lg bg-slate-200/70" />
                  <div className="h-6 w-20 rounded-lg bg-slate-200/70" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Profile Image with Upload Trigger */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md flex items-center justify-center">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Camera Overlay to Change Image */}
                <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] font-semibold">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploadingImage}
                  />
                </label>

                {uploadingImage && (
                  <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center text-[10px] font-bold text-blue-600">
                    Loading...
                  </div>
                )}

                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
              </div>

              <div className="text-center sm:text-left flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-slate-900 capitalize">
                    {fullName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 uppercase">
                    {profile?.status || "Active"}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600 flex items-center justify-center sm:justify-start gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#316AFF]" />
                  <span>{profile?.designation_title || "Employee"}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[#316AFF] font-bold">
                    {profile?.department_name || "General"}
                  </span>
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-xs">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {profile?.work_email || "N/A"}
                  </span>
                  <span className="flex items-center gap-1 bg-blue-50/60 px-2.5 py-1 rounded-lg border border-blue-100 text-blue-700 font-mono font-bold shadow-xs">
                    <Hash className="w-3 h-3 text-blue-500" />
                    {profile?.employee_code || "EMP"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200/80 -mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "personal"
                  ? "border-[#316AFF] text-[#316AFF]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Personal & Contact Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("organization")}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "organization"
                  ? "border-[#316AFF] text-[#316AFF]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Organizational Details
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {message && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-2 py-1 text-xs font-semibold text-slate-500">
                <Loader2 className="w-4 h-4 text-[#316AFF] animate-spin" />
                Loading your profile...
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-2.5 w-24 rounded bg-slate-200/80" />
                    <div className="h-9 w-full rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "personal" ? (
            <form
              id="profile-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    name="personal_email"
                    value={formData.personal_email}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    name="mobile_number"
                    required
                    value={formData.mobile_number}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Alternate Mobile
                  </label>
                  <input
                    type="text"
                    name="alternate_mobile"
                    value={formData.alternate_mobile}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Marital Status
                  </label>
                  <select
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] focus:bg-white"
                  >
                    <option value="">Select status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Current Address
                  </label>
                  <textarea
                    name="current_address"
                    rows={2}
                    value={formData.current_address}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#316AFF] resize-none"
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Employee Code
                </span>
                <span className="text-xs font-extrabold text-slate-800 font-mono">
                  {profile?.employee_code || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Department
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {profile?.department_name || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Designation
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {profile?.designation_title || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Employment Type
                </span>
                <span className="text-xs font-extrabold text-slate-800 capitalize">
                  {profile?.employment_type || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Reporting Manager
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {profile?.reporting_manager_name || "None"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  System Role
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="h-4 w-1 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    {profile?.system_role ===
                      "default-roles-hrms-herbal-realm" || !profile?.system_role
                      ? "Employee"
                      : profile?.system_role.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          {activeTab === "personal" && (
            <button
              type="submit"
              form="profile-form"
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#316AFF] px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#2554d7] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}