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
  return <div className="workspace-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
    <div className="workspace-body"><Header toggleSidebar={toggleSidebar} /><main id="main-content" className="workspace-content" tabIndex={-1}>{children}</main><Footer /></div>
  </div>;
}
