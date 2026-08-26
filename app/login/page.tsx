"use client";

import { useAuth } from "../context/AuthContext"; // Update path to your AuthContext file if needed
import { ShieldCheck, LockKeyhole, Building2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="absolute w-96 h-96 bg-blue-500/20 blur-3xl rounded-full top-10 left-10"></div>
      <div className="absolute w-96 h-96 bg-cyan-400/10 blur-3xl rounded-full bottom-10 right-10"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Building2 className="text-white w-10 h-10" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-white">HRMS Portal</h1>
            <p className="mt-2 text-sm text-slate-300">
              Secure access to your management platform
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-slate-200">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>Enterprise-grade authentication</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <LockKeyhole className="w-5 h-5 text-cyan-400" />
              <span>Role-based secure access</span>
            </div>
          </div>

          <button
            onClick={login}
            className="mt-8 w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-cyan-500/25"
          >
            Login with Keycloak
          </button>
        </div>
      </div>
    </div>
  );
}