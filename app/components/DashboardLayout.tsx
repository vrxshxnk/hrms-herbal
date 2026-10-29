"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setIsSidebarOpen(open => !open), []);

  if (pathname === "/login" || pathname === "/logout") return <>{children}</>;

  return (
    // Body background with the exact soft mint/sage tint matching original site
    <div className="min-h-screen bg-[#f2f5f3] text-slate-800">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-white focus:z-50">
        Skip to content
      </a>

      {/* Left Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <Header toggleSidebar={toggleSidebar} />
        
        {/* Workspace Canvas Container */}
        <main id="main-content" className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto" tabIndex={-1}>
          <div className="bg-[#f2f5f3] rounded-3xl min-h-[calc(100vh-120px)]">
            {children}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}