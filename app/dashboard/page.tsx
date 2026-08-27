"use client";
import React, { useState } from "react";

import {
  Users,
  UserPlus,
  Calendar,
  Briefcase,
  Clock,
  Plus,
} from "lucide-react";

const stats = [
  {
    title: "Total Employee",
    value: "1206",
    change: "+5%",
    trend: "up",
    icon: Users,
    iconBgColor: "bg-[#FF8400]", // Solid Orange badge
    cardBgColor: "bg-[#FFF7F2]", // Warm soft orange background
  },
  {
    title: "New Employee",
    value: "218",
    change: "+3.2%",
    trend: "up",
    icon: UserPlus,
    iconBgColor: "bg-[#00B4D8]", // Solid Cyan badge
    cardBgColor: "bg-[#F0FBFD]", // Cool soft cyan background
  },
  {
    title: "On Leave",
    value: "126",
    change: "-2%",
    trend: "down",
    icon: Calendar,
    iconBgColor: "bg-[#FFB703]", // Solid Yellow badge
    cardBgColor: "bg-[#FFFDF0]", // Soft yellow background
  },
  {
    title: "Job Applicants",
    value: "776",
    change: "+8%",
    trend: "up",
    icon: Briefcase,
    iconBgColor: "bg-[#00A86B]", // Solid Green badge
    cardBgColor: "bg-[#F0FAF5]", // Soft green background
  },
  {
    title: "Over Time",
    value: "1017",
    change: "-8%",
    trend: "down",
    icon: Clock,
    iconBgColor: "bg-[#FF3B30]", // Solid Red badge
    cardBgColor: "bg-[#FFF5F5]", // Soft red background
  },
];

export default function DashboardPage() {

  return (
    <>

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Mon, Aug 01, 2024 – Sep 01, 2024
            </p>
          </div>
          <button className="flex items-center justify-center gap-2 bg-[#316AFF] hover:bg-[#2554d7] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                className={`${stat.cardBgColor} p-4 rounded-2xl flex flex-col justify-between`}
              >
                {/* Solid colored circle badge with white icon */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${stat.iconBgColor}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="mt-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h2>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {stat.title}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] font-medium">
                    <span
                      className={
                        stat.trend === "up"
                          ? "text-[#00A86B]"
                          : "text-[#FF3B30]"
                      }
                    >
                      {stat.change}
                    </span>
                    <span className="text-slate-400">Last Month</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
