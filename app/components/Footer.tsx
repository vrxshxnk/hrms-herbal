"use client";

import React from "react";
import Link from "next/link";
import {
  Leaf,
  Globe,
  HelpCircle,
  LifeBuoy,
  ArrowUpRight,
  ArrowUp,
  ShieldCheck,
  Users,
  Calendar,
  Wallet,
  FileText,
  Megaphone,
  Mail,
} from "lucide-react";

const modules = [
  { label: "Employees", href: "/employee", icon: Users, tint: "text-orange-500 bg-orange-50" },
  { label: "Leave", href: "/leave", icon: Calendar, tint: "text-indigo-500 bg-indigo-50" },
  { label: "Advance Salary", href: "/salary", icon: Wallet, tint: "text-amber-500 bg-amber-50" },
  { label: "Reimbursements", href: "/reimbursements", icon: FileText, tint: "text-emerald-500 bg-emerald-50" },
  { label: "Announcements", href: "/announcements", icon: Megaphone, tint: "text-rose-500 bg-rose-50" },
];

const resources = [
  { label: "Portal Home", href: "/", icon: Globe },
  { label: "FAQ's", href: "/faq", icon: HelpCircle },
  { label: "Support", href: "#", icon: LifeBuoy },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-auto w-full overflow-hidden border-t border-slate-200/80 bg-white">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#316AFF] via-[#00B4D8] to-emerald-400" />

      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F5F8FF] via-white to-white" />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(#DCE5F7 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 65%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, transparent 65%)",
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#316AFF]/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-44 w-44 rounded-full bg-emerald-400/[0.08] blur-3xl" />

      {/* Reduced vertical padding here (pt-4 lg:pt-5) */}
      <div className="relative mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:pt-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12 lg:gap-6 items-center">
          {/* Brand */}
          <div className="md:col-span-6 lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#316AFF] to-[#00B4D8] text-white shadow-sm">
                <Leaf className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-tight text-slate-900">
                  Herbal Creations
                </p>
                <p className="text-[10px] font-semibold text-emerald-600">
                  Nurtured by Nature
                </p>
              </div>
            </div>

            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              One workspace for your people operations: employees, attendance,
              leave, payroll and everything in between.
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                All systems online
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                <ShieldCheck className="h-3 w-3 text-[#316AFF]" />
                Secure &amp; encrypted
              </span>
            </div>
          </div>

          {/* Modules */}
          <nav aria-label="Modules" className="md:col-span-6 lg:col-span-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Modules
            </h4>
            <ul className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              {modules.map(({ label, href, icon: Icon, tint }, i) => (
                <li
                  key={label}
                  className={
                    i === modules.length - 1 ? "col-span-2 sm:col-span-1" : ""
                  }
                >
                  <Link
                    href={href}
                    className="group flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-none transition-all hover:border-[#316AFF]/30 hover:text-[#316AFF] active:scale-[0.98] lg:-mx-1.5 lg:border-transparent lg:bg-transparent lg:px-1.5 lg:py-0.5 lg:font-medium lg:text-slate-600 lg:hover:bg-[#316AFF]/[0.07]"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${tint} lg:h-auto lg:w-auto lg:bg-transparent lg:text-slate-400 lg:group-hover:text-[#316AFF]`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resources */}
          <nav aria-label="Resources" className="md:col-span-3 lg:col-span-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Resources
            </h4>
            <ul className="mt-1.5 flex flex-wrap gap-1 lg:flex-col">
              {resources.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-all hover:border-[#316AFF]/30 hover:text-[#316AFF] active:scale-[0.98] lg:-mx-1.5 lg:flex lg:rounded-lg lg:border-transparent lg:bg-transparent lg:px-1.5 lg:py-0.5 lg:font-medium lg:text-slate-600 lg:hover:bg-[#316AFF]/[0.07]"
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-[#316AFF]" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Help card */}
          <div className="md:col-span-3 lg:col-span-3">
            <div className="flex items-center gap-3 rounded-xl border border-[#316AFF]/15 bg-gradient-to-br from-[#EEF3FF] to-white p-2.5 shadow-none">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#316AFF] text-white shadow-sm">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900">Need help?</p>
                <p className="text-[11px] leading-tight text-slate-500">
                  Our support team is happy to assist.
                </p>
                <Link
                  href="#"
                  className="group mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#316AFF]"
                >
                  Contact support
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar with tighter padding (py-2.5) */}
        <div className="mt-4 flex flex-col-reverse items-center gap-2 border-t border-slate-200/80 py-2.5 text-[11px] sm:flex-row sm:justify-between lg:mt-5">
          <p className="text-center font-medium text-slate-400 sm:text-left">
            &copy; {year}{" "}
            <span className="font-semibold text-slate-600">
              Herbal Creations
            </span>
            . All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            <span className="hidden font-medium text-slate-400 md:inline">
              HRMS Workspace
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="group inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-semibold text-slate-600 transition-all hover:border-[#316AFF]/40 hover:text-[#316AFF] active:scale-[0.98]"
            >
              Back to top
              <ArrowUp className="h-3 w-3 transition-transform group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;