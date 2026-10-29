"use client";
import { useAuth } from "../context/AuthContext";
import { Leaf, ArrowRight, ShieldCheck, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden select-none">
      {/* Left Panel - Branding & Creative Hero */}
      <div className="relative w-full lg:w-[48%] bg-[#1c4332] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden min-h-[380px] lg:min-h-screen shrink-0">
        
        {/* Background Subtle Organic Leaf Overlay Graphics */}
        <div className="absolute right-[-10%] bottom-[-5%] w-[450px] h-[450px] lg:w-[600px] lg:h-[600px] opacity-15 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-emerald-200 fill-none stroke-[0.5]">
            <path d="M40 100 C 40 40, 100 40, 100 100 C 100 160, 160 160, 160 100" />
            <path d="M100 20 C 40 80, 40 140, 100 180 C 160 140, 160 80, 100 20 Z" />
            <path d="M20 100 Q 100 20, 180 100 Q 100 180, 20 100" />
          </svg>
        </div>

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-sm">
            <Leaf className="w-5 h-5 fill-emerald-300/20" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">
            Herbal Creations
          </span>
        </div>

        {/* Headline Tagline */}
        <div className="relative z-10 my-auto py-10 lg:py-0 max-w-lg">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.15] text-emerald-50 tracking-tight">
            Good work <br />
            starts with <br />
            <span className="italic font-serif text-emerald-200 font-light">
              your people.
            </span>
          </h1>
        </div>

        {/* Bottom Tag / Footer */}
        <div className="relative z-10 text-xs text-emerald-200/70 font-medium tracking-wide uppercase">
          HRMS Enterprise Platform
        </div>
      </div>

      {/* Right Panel - Action & Sign In */}
      <div className="flex-1 bg-[#fcfdfd] flex flex-col justify-between p-8 sm:p-12 lg:p-20 relative">
        <div className="my-auto max-w-md w-full mx-auto space-y-8">
          
          {/* Section Header */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              YOUR WORKSPACE, CONNECTED
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Welcome back.
            </h2>
          </div>

          {/* Action Trigger */}
          <div className="space-y-4 pt-2">
            <button
              onClick={login}
              className="w-full bg-[#1c4332] hover:bg-[#153427] transition-all duration-200 text-white font-medium py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-between group cursor-pointer"
            >
              <span className="text-sm font-semibold tracking-wide">
                Sign in to your workspace
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Feature Security Badge */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100/60 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-[#1c4332] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Secure company sign-in</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  You&apos;ll continue to your organization&apos;s Keycloak SSO portal.
                </p>
              </div>
            </div>
          </div>

          {/* Subtext info */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center sm:text-left leading-relaxed">
              Need access? Contact your HR team or system administrator.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center sm:text-left text-[11px] text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} Herbal Creations. All rights reserved.
        </div>
      </div>
    </div>
  );
}
