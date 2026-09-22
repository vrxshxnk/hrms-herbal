"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { User, Plus, Minus } from "lucide-react";

export type OrgTier = "leader" | "manager" | "ic";

export type OrgNodeData = {
  id: string;
  name: string;
  designation: string;
  department: string;
  employee_code: string;
  profile_photo_url?: string | null;
  subordinatesCount?: number;
  tier: OrgTier;
  isCurrentUser?: boolean;
  isSelected?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  onSelect?: (id: string) => void;
};

// Color by hierarchy tier — matches the legend shown under the chart.
export const TIER_PALETTE: Record<OrgTier, { dot: string; avatarBg: string; avatarText: string; label: string }> = {
  leader: { dot: "#8B5CF6", avatarBg: "#EDE9FE", avatarText: "#6D28D9", label: "Company leader" },
  manager: { dot: "#3B82F6", avatarBg: "#DBEAFE", avatarText: "#1D4ED8", label: "Manager" },
  ic: { dot: "#94A3B8", avatarBg: "#F1F5F9", avatarText: "#475569", label: "Individual contributor" },
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const OrgNodeComponent = memo(({ data }: { data: OrgNodeData }) => {
  const palette = TIER_PALETTE[data.tier];
  const hasChildren = !!data.subordinatesCount;

  return (
    <div className="relative" style={{ width: 220 }}>
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 !border-0" />

      <div
        onClick={() => data.onSelect?.(data.id)}
        className={`bg-white rounded-xl shadow-sm p-3 cursor-pointer transition-all hover:shadow-md ${
          data.isSelected
            ? "border-2 border-emerald-500 ring-2 ring-emerald-100"
            : "border border-slate-200"
        }`}
      >
        {hasChildren && (
          <span className="absolute -top-2 right-3 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200">
            {data.subordinatesCount}
          </span>
        )}

        <div className="flex items-center gap-2.5">
          {data.profile_photo_url ? (
            <img src={data.profile_photo_url} alt={data.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ backgroundColor: palette.avatarBg, color: palette.avatarText }}
            >
              {initials(data.name) || <User className="w-4 h-4" />}
            </div>
          )}

          <div className="overflow-hidden text-left">
            <h3 className="font-semibold text-sm text-slate-800 truncate leading-tight">{data.name}</h3>
            <p className="text-xs text-slate-500 truncate">{data.designation}</p>
            {data.department && <span className="text-[10px] text-slate-400">{data.department}</span>}
          </div>
        </div>

        {hasChildren && (
          <p className="text-[10px] text-slate-400 mt-2 pl-11">
            {data.subordinatesCount} report{data.subordinatesCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.(data.id);
          }}
          className="absolute left-1/2 -bottom-3 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-500 hover:border-emerald-400 hover:text-emerald-600 shadow-sm z-10"
          title={data.isCollapsed ? "Expand" : "Collapse"}
        >
          {data.isCollapsed ? <Plus size={12} /> : <Minus size={12} />}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2 !border-0" />
    </div>
  );
});

OrgNodeComponent.displayName = "OrgNodeComponent";