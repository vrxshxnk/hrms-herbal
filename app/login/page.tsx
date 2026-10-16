"use client";

import { useAuth } from "../context/AuthContext";
import { ShieldCheck, LockKeyhole, Building2, Leaf } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute w-[500px] h-[500px] bg-blue-400/10 blur-[120px] rounded-full -top-20 -left-20 pointer-events-none"></div>
      <div className="absolute w-[500px] h-[500px] bg-emerald-400/10 blur-[120px] rounded-full -bottom-20 -right-20 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-[0_20px_50px_rgba(49,106,255,0.08)] p-8 sm:p-10">
          
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#316AFF] to-[#00B4D8] flex items-center justify-center shadow-lg shadow-blue-500/25 text-white">
              <Building2 className="w-8 h-8" />
            </div>
            
            <div className="flex items-center gap-1.5 mt-4">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                <Leaf className="w-3 h-3" /> Herbal Creations
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              HRMS Workspace
            </h1>
            <p className="mt-1.5 text-xs text-slate-500">
              Secure single sign-on access to your management platform
            </p>
          </div>

          {/* Features List */}
          <div className="mt-8 space-y-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-3 text-slate-700 text-xs font-medium">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#316AFF] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>Enterprise-grade Keycloak authentication</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700 text-xs font-medium">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <LockKeyhole className="w-4 h-4" />
              </div>
              <span>Role-based workspace & permission control</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={login}
            className="mt-8 w-full bg-gradient-to-r from-[#316AFF] to-[#00B4D8] hover:opacity-95 transition-all duration-200 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Login with Keycloak</span>
          </button>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} Herbal Creations. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}