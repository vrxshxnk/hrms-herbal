"use client";

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    // Triggers client-side keycloak logout
    logout();
  }, [logout]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400"></div>
        <p className="text-slate-300">Logging out of HRMS Portal...</p>
      </div>
    </div>
  );
}