"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const { roles, authenticated } = useAuth();
  console.log("current role of login user", roles);

  if (pathname === "/login" || !authenticated) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - Permanent on desktop (lg:), Toggleable drawer on mobile */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      {/* Main Content Container - Fixed offset on desktop (lg:ml-72) */}
      <div className="min-h-screen flex flex-col lg:ml-72 transition-all duration-300 ease-in-out">
        <Header toggleSidebar={toggleSidebar} />

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout;