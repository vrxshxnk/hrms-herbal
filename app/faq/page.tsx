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
  {
    category: "General Questions",
    items: [
      {
        id: "gen-1",
        question: "What is your return policy?",
        answer:
          "We offer a 30-day money-back guarantee for all eligible products. Items must be returned in their original condition.",
      },
      {
        id: "gen-2",
        question: "How long does shipping take?",
        answer:
          "Standard shipping takes 3-5 business days. Express options are available at checkout.",
      },
      {
        id: "gen-3",
        question: "Do you offer customer support?",
        answer:
          "Yes, our dedicated support team is available 24/7 via live chat, email, or telephone.",
      },
    ],
  },
  {
    category: "Manage Account",
    items: [
      {
        id: "acc-1",
        question: "How do I update my account information?",
        answer:
          "Navigate to Account Settings in your profile dashboard to update your personal details and preferences.",
      },
      {
        id: "acc-2",
        question: "How can I change my password?",
        answer:
          "Go to Security Settings under your account, click 'Change Password', and follow the instructions sent to your email.",
      },
      {
        id: "acc-3",
        question: "How do I delete my account?",
        answer:
          "You can request account deletion under Privacy Settings. Please note this action is permanent.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    items: [
      {
        id: "priv-1",
        question: "How is my personal data protected?",
        answer:
          "We use end-to-end 256-bit SSL encryption and follow strict compliance protocols to ensure your data is secure.",
      },
      {
        id: "priv-2",
        question: "Can I control who sees my information?",
        answer:
          "Yes, you can customize your visibility and sharing settings in the Privacy Control tab.",
      },
      {
        id: "priv-3",
        question: "How can I delete my data?",
        answer:
          "Submit a data deletion request through our privacy portal or contact privacy@yourdomain.com directly.",
      },
    ],
  },
];

export default function FAQPage() {
  const { token, roles, hasRole } = useAuth();
  const isHR = (roles && roles.includes("hr")) || (hasRole && hasRole("hr"));
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
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
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "closed":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background">
      {/* 1. Header & Breadcrumbs */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FAQ</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Dashboard <span className="mx-1">/</span> <span className="text-slate-600">FAQ</span>
        </p>
      </div>

      {/* 2. HR Query Management Panel (Visible only to HR role) */}
      {isHR && (
        <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-2 rounded-xl transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueries ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingQueries ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
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
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 px-6 py-12 sm:py-14 text-center text-white shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Have a question? We&apos;re ready to help!
          </h2>
          <p className="text-sm text-blue-100 font-normal">
            Or choose a section to find what you need in seconds.
          </p>

          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full pl-11 pr-4 py-3 bg-white text-slate-800 text-sm placeholder-slate-400 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (FAQ Sections & Contact Banner) */}
        <div className="lg:col-span-8 space-y-8">
          {faqData.map((group) => (
            <div key={group.category} className="space-y-3">
              <h3 className="text-base font-bold text-slate-800">{group.category}</h3>
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {group.items.map((item) => {
                  const isOpen = !!openItems[item.id];
                  return (
                    <div key={item.id} className="transition-colors">
                      <button
                        onClick={() => toggleAccordion(item.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/80 transition-all group"
                      >
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-600" : ""
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

          {/* Contact Details Card */}
          <div className="bg-[#FFFDF3] border border-[#FDEECA] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xs">
            <div className="space-y-6 w-full md:w-auto">
              <h4 className="text-base font-bold text-slate-900">You still have a question?</h4>

              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                {/* Phone Call block */}
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">+(01) 123 456 7890</p>
                    <p className="text-xs text-slate-400">Always here, ready to help</p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-[1px] bg-amber-200/50 self-stretch" />

                {/* Email block */}
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">support-herbal-creations@gmail.com</p>
                    <p className="text-xs text-slate-400">Looking for a quick answer? Let&apos;s connect</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphic Illustration */}
            <div className="relative shrink-0 w-36 h-28 hidden md:flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 160 140" fill="none">
                <path d="M70 110 C70 80, 90 60, 120 60 C140 60, 150 80, 150 110" fill="#2563EB" />
                <path d="M40 90 A 35 35 0 0 1 100 90 L 70 90 Z" fill="#EF4444" />
                <path d="M70 90 A 35 35 0 0 1 70 30 L 70 90 Z" fill="#10B981" />
                <path d="M70 90 A 35 35 0 0 1 110 60 L 70 90 Z" fill="#F59E0B" />
              </svg>
            </div>
          </div>
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
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

          {/* Need More Help Avatar Card */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-6 text-center space-y-4">
            {/* Avatar Group */}
            <div className="flex justify-center -space-x-2 overflow-hidden py-1">
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"
                alt="Support member"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100"
                alt="Support member"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100"
                alt="Support member"
              />
              <img
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100"
                alt="Support member"
              />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">Need more help?</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Can&apos;t find your answer here? Chat with our support team anytime.
              </p>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              Chat with us
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}