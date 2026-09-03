"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";
type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const {roles, hasRole}= useAuth();
  console.log("current role of login user", roles);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div
        className={`
          min-h-screen flex flex-col
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "lg:ml-62" : "lg:ml-0"}
        `}
      >
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
