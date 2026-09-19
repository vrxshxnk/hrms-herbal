"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  File as FileIcon,
  Loader2,
  User,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

type DocCategory =
  | "aadhar"
  | "pan"
  | "education"
  | "experience"
  | "relieving"
  | "bank"
  | "other";

interface UploadedDoc {
  id: string;
  category: DocCategory;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: "verified" | "pending" | "rejected";
}

const CATEGORIES: { key: DocCategory; label: string; description: string }[] = [
  { key: "aadhar", label: "Aadhaar Card", description: "Front & Back copy (PDF/Image)" },
  { key: "pan", label: "PAN Card", description: "Clear scanned image or PDF" },
  { key: "education", label: "Education Certificates", description: "Degrees, Diplomas, Marksheets" },
  { key: "experience", label: "Experience Letter", description: "Previous employer experience letters" },
  { key: "relieving", label: "Relieving Letter", description: "Relieving letter from last company" },
  { key: "bank", label: "Bank Passbook / Cheque", description: "Cancelled cheque or passbook front page" },
  { key: "other", label: "Other Documents", description: "Any additional supporting documents" },
];

function DocumentUploadContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, dbUser } = useAuth();

  const employeeId = (params.id as string) || dbUser?.id || "";
  const employeeName = searchParams.get("name") || dbUser?.first_name || "Employee";

  const [selectedCategory, setSelectedCategory] = useState<DocCategory>("aadhar");
  // Multi-file state: array of File objects
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      let maxLimitExceeded = false;

      filesArray.forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
          maxLimitExceeded = true;
        } else {
          validFiles.push(file);
        }
      });

      if (maxLimitExceeded) {
        setMessage({ type: "error", text: "Some files were skipped because they exceed 10MB limit." });
      } else {
        setMessage(null);
      }

      // Append new valid files to existing selected files list
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !employeeId) {
      setMessage({ type: "error", text: "Please select at least one file to upload" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const newlyUploaded: UploadedDoc[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      // Loop over each file and upload individually to endpoint
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", selectedCategory);
        formData.append("employee_id", employeeId);

        const res = await fetch("/api/v1/employee/documents", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const responseData = await res.json();

        if (res.ok && responseData.meta?.success) {
          successCount++;
          const createdDoc = responseData.data;

          newlyUploaded.push({
            id: createdDoc?.id || `${Date.now()}-${Math.random()}`,
            category: selectedCategory,
            fileName: createdDoc?.file_name || file.name,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            uploadedAt: new Date().toLocaleDateString("en-GB"),
            status: createdDoc?.status || "pending",
          });
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        setUploadedDocs((prev) => [...newlyUploaded, ...prev]);
        setSelectedFiles([]);
        
        if (failCount === 0) {
          setMessage({
            type: "success",
            text: `${successCount} document(s) uploaded successfully!`,
          });
        } else {
          setMessage({
            type: "error",
            text: `${successCount} file(s) uploaded, but ${failCount} file(s) failed.`,
          });
        }
      } else {
        throw new Error("Failed to upload selected file(s)");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to upload document(s)" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Upload Employee Documents</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5 text-[#316AFF]" />
              <span>Target Employee:</span>
              <span className="font-semibold text-slate-700">{employeeName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messaging */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Document Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedCategory === cat.key
                        ? "border-[#316AFF] bg-blue-50/50 text-[#316AFF] ring-1 ring-[#316AFF]"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50"
                    }`}
                  >
                    <p className="text-xs font-bold">{cat.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop Zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                File Attachment(s)
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-[#316AFF] transition-colors rounded-2xl p-6 text-center bg-slate-50/50 relative">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-blue-50 text-[#316AFF] rounded-2xl">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Click to browse or drag files here (Select single or multiple files)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports PDF, PNG, JPG (Max 10MB per file)
                  </p>
                </div>
              </div>

              {/* Staged files preview list */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">
                    Selected Files ({selectedFiles.length}):
                  </p>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-700"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#316AFF] shrink-0" />
                        <span className="font-medium truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#316AFF] hover:bg-[#2554d7] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading {selectedFiles.length} Document(s)...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Submit {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ""}Document(s)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Uploaded History Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Recent Uploads
          </h2>

          {uploadedDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <FileIcon className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <p className="font-semibold text-slate-800 capitalize truncate">
                      {doc.category}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{doc.fileName}</p>
                    <p className="text-[9px] text-slate-400">{doc.uploadedAt}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize bg-amber-50 text-amber-600 shrink-0">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#316AFF]" />
        </div>
      }
    >
      <DocumentUploadContent />
    </Suspense>
  );
}