"use client";

import { Plus } from "lucide-react";
import { DonutChart } from "../components/DonutChart"; 
import { useState } from "react";

const Page = () => {
  const [hoverIdx, setHoverIdx]= useState<number | null> (null); 
  const stats = [
    {
      title: "Today Presents",
      value: "1192",
      total: "1206",
      percentage: 80,
      textColor: "text-blue-500",
      hexColor: "#3b82f6", 
    },
    {
      title: "Planned Leaves",
      value: "128",
      total: "1206",
      percentage: 20,
      textColor: "text-rose-500",
      hexColor: "#f43f5e", // rose-500
    },
    {
      title: "Unplanned Leaves",
      value: "12",
      total: "1206",
      percentage: 49,
      textColor: "text-cyan-500",
      hexColor: "#06b6d4", // cyan-500
    },
    {
      title: "Pending Requests",
      value: "50",
      total: "70",
      percentage: 68,
      textColor: "text-orange-500",
      hexColor: "#f97316", // orange-500
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leaves</h2>
          <p className="text-sm text-gray-500">Verify leaves over here ....</p>
        </div>

        <button className="flex items-center justify-center gap-2 bg-[#316AFF] hover:bg-[#2554d7] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Add Leave
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            onMouseEnter={()=>setHoverIdx(index)}
            onMouseLeave={()=>setHoverIdx(index)}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between"
            style={{borderWidth: hoverIdx === index ? "2px" : "1px",borderColor:hoverIdx === index ? stat.hexColor : "#e5e7eb"}}
          >
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  /{stat.total}
                </span>
              </div>
              <p className={`text-xs font-semibold mt-1 ${stat.textColor}`}>
                {stat.title}
              </p>
            </div>

            {/* Recharts Donut Component */}
            <DonutChart percentage={stat.percentage} color={stat.hexColor} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;