"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Clock,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

interface FAQQueryItem {
  id: string;
  name: string | null;
  email: string;
  subject: string;
  question: string;
  status: "pending" | "in_review" | "resolved" | "closed";
  created_at: string;
}

const faqData = [
  { category: "Time & attendance", items: [
    { id: "attendance-1", question: "How do I check my attendance?", answer: "Open Attendance from People & time in the sidebar. Choose the month and review the daily status codes. P means present, A means absent, and WO means week off. Hover over a recorded day for shift and timing details." },
    { id: "attendance-2", question: "How does HR import the monthly register?", answer: "In Attendance, choose Import register and select the provider's .xls or .xlsx Performance Register. Preview the file first. Review unmatched pay codes, set up missing mappings, and preview again before importing matched rows." },
    { id: "attendance-3", question: "Can an attendance entry be corrected?", answer: "Use Manual entry in Attendance to select an employee and date, then enter the status, shift, check-in, check-out, total work hours, and overtime. Saved manual entries take priority over provider imports. Contact HR if you do not have permission to save a correction." },
  ] },
  { category: "Requests & approvals", items: [
    { id: "requests-1", question: "How do I request time off?", answer: "Open Time off and select Request time off. Complete the leave type, dates, and reason, then submit. You can follow your request and its approval status in the request list." },
    { id: "requests-2", question: "Where do I submit expense receipts?", answer: "Open Reimbursements, choose New Expense Claim, and complete the expense details. Attach the supporting receipt and submit the claim. Track approvals and payment status on the same page." },
    { id: "requests-3", question: "How do I request a salary advance?", answer: "Open Salary advances from Requests. Choose New Advance Request and complete the form. Your request history shows the current status. Contact HR for your organization's eligibility and repayment policies." },
  ] },
  { category: "Your people workspace", items: [
    { id: "workspace-1", question: "Where can I find my employee code?", answer: "Open People directory and search for your name. Your HRMS employee code appears on your card and in list view. A provider Pay Code can be different; HR links the two through Pay code mapping in Attendance." },
    { id: "workspace-2", question: "How can I update my details or upload documents?", answer: "Find your record in People directory. HR can edit employee details from the actions menu. Use Documents or Upload Docs to open the document screen for the selected employee." },
    { id: "workspace-3", question: "Who can help with access or password problems?", answer: "Contact your HR team or system administrator. Sign-in uses your company account, and access to actions depends on your assigned role. Do not share passwords in a help request." },
  ] },
];

export default function FAQPage() {
  const { token, roles, hasRole } = useAuth();
  const isHR = (roles && roles.includes("hr")) || (hasRole && hasRole("hr"));
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const filteredFaqs = faqData.map(group => ({ ...group, items: group.items.filter(item => `${item.question} ${item.answer}`.toLowerCase().includes(searchQuery.trim().toLowerCase())) })).filter(group => group.items.length > 0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    question: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // HR Portal Management State
  const [queries, setQueries] = useState<FAQQueryItem[]>([]);
  const [isLoadingQueries, setIsLoadingQueries] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch submitted queries (HR Only)
  const fetchQueries = useCallback(async () => {
    if (!isHR || !token) return;
    setIsLoadingQueries(true);
    try {
      const res = await fetch("/api/v1/faq", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (res.ok && result.data.data) {
        setQueries(result.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch user queries:", err);
    } finally {
      setIsLoadingQueries(false);
    }
  }, [isHR, token]);

  useEffect(() => {
    if (isHR) {
      fetchQueries();
    }
  }, [isHR, fetchQueries]);

  // Update Query Status (HR Only)
  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/v1/faq/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setQueries((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: newStatus as any } : q))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/v1/faq", {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit your question.");
      }

      setStatusMessage({
        type: "success",
        text: "Your question has been submitted successfully! We will get back to you shortly.",
      });

      setFormData({
        name: "",
        email: "",
        subject: "",
        question: "",
      });

      // Refresh HR list if user has HR access
      if (isHR) fetchQueries();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "in_review":
        return "bg-brand-50 text-brand-700 border-brand-200";
      case "resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "closed":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Breadcrumbs */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Help center</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Practical guidance for your everyday workspace.
        </p>
      </div>

      {/* 2. HR Query Management Panel (Visible only to HR role) */}
      {isHR && (
        <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">User Inquiries (HR Portal)</h3>
                <p className="text-xs text-slate-400">
                  Review incoming questions and manage their status
                </p>
              </div>
            </div>
            <button
              onClick={fetchQueries}
              disabled={isLoadingQueries}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-3 py-2 rounded-xl transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueries ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingQueries ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto" />
              <p className="text-xs text-slate-400">Loading submitted queries...</p>
            </div>
          ) : queries.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-1">
              <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No user queries submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queries.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-900">
                        {item.name || "Anonymous User"}
                      </span>
                      <span className="text-xs text-slate-400 block sm:inline sm:ml-2">
                        ({item.email})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status.replace("_", " ").toUpperCase()}
                      </span>

                      <select
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:border-brand-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_review">In Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{item.subject}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                      {item.question}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>Submitted on {new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-brand-800 px-6 py-10 text-center text-white">
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            How can we help?
          </h2>
          <p className="text-sm text-brand-100 font-normal">
            Or choose a section to find what you need in seconds.
          </p>

          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                aria-label="Search help articles"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search attendance, leave, expenses..."
                className="w-full pl-11 pr-4 py-3 bg-white text-slate-800 text-sm placeholder-slate-400 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (FAQ Sections & Contact Banner) */}
        <div className="lg:col-span-8 space-y-8">
          {filteredFaqs.length === 0 && <p role="status" className="p-6 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">No answers found. Try a different search or send HR a question.</p>}
          {filteredFaqs.map((group) => (
            <div key={group.category} className="space-y-3">
              <h3 className="text-base font-bold text-slate-800">{group.category}</h3>
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {group.items.map((item) => {
                  const isOpen = !!openItems[item.id];
                  return (
                    <div key={item.id} className="transition-colors">
                      <button
                        aria-expanded={isOpen}
                        onClick={() => toggleAccordion(item.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/80 transition-all group"
                      >
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-brand-600" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-50">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-brand-100 bg-brand-50 p-6"><h3 className="text-sm font-semibold">Need a hand from HR?</h3><p className="mt-2 text-xs leading-relaxed text-slate-600">Send a question using the form on this page. Include enough detail for your HR team to help, but never include passwords or sensitive account information.</p></div>
        </div>

        {/* Right Column (Question Form & Support Live Chat Box) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Ask Question Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Have More Questions?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Send us your question, and we will get back to you shortly.
              </p>
            </div>

            {/* Status Alert Banner */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Enter your subject"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Your Question *</label>
                <textarea
                  rows={4}
                  name="question"
                  required
                  value={formData.question}
                  onChange={handleInputChange}
                  placeholder="Type your question here..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Question"
                )}
              </button>
            </form>
          </div>


        </div>

      </div>
    </div>
  );
}
