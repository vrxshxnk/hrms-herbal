"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";

export type OrgNodeData = {
  name: string;
  designation: string;
  department: string;
  employee_code: string;
  profile_photo_url?: string | null;
  subordinatesCount?: number;
  isCurrentUser?: boolean;
};

// Soft, soothing pastel per department — like different branches of a tree.
// Falls back to a neutral slate tone for unmatched/empty departments.
const DEPARTMENT_PALETTE: Record<string, { bg: string; ring: string; text: string; avatarBg: string }> = {
  IT: { bg: "#EAF2FF", ring: "#BFDBFE", text: "#1D4ED8", avatarBg: "#DBEAFE" },
  QC: { bg: "#EAFBF1", ring: "#BBF7D0", text: "#15803D", avatarBg: "#DCFCE7" },
  QA: { bg: "#F5F0FF", ring: "#DDD6FE", text: "#6D28D9", avatarBg: "#EDE9FE" },
  HR: { bg: "#FFF7E8", ring: "#FDE68A", text: "#B45309", avatarBg: "#FEF3C7" },
  "DIGITAL MARKETING": { bg: "#FFF0F5", ring: "#FBCFE8", text: "#BE185D", avatarBg: "#FCE7F3" },
};

const DEFAULT_PALETTE = { bg: "#F8FAFC", ring: "#E2E8F0", text: "#475569", avatarBg: "#F1F5F9" };

function getPalette(department: string) {
  const key = (department || "").trim().toUpperCase();
  return DEPARTMENT_PALETTE[key] ?? DEFAULT_PALETTE;
}

export const OrgNodeComponent = memo(({ data }: { data: OrgNodeData }) => {
  const palette = getPalette(data.department);

  return (
    <div
      className="flex flex-col items-center text-center transition-transform hover:scale-105"
      style={{ width: 220 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      <div
        className="rounded-full flex flex-col items-center justify-center px-5 py-6 shadow-sm"
        style={{
          backgroundColor: palette.bg,
          border: `2px solid ${data.isCurrentUser ? "#2563eb" : palette.ring}`,
          boxShadow: data.isCurrentUser
            ? "0 0 0 4px rgba(37,99,235,0.15)"
            : "0 1px 3px rgba(15,23,42,0.06)",
          minHeight: 150,
        }}
      >
        {data.profile_photo_url ? (
          <img
            src={data.profile_photo_url}
            alt={data.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm mb-2"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: palette.avatarBg, color: palette.text }}
          >
            <User className="w-5 h-5" />
          </div>
        )}

        <h3 className="font-semibold text-sm text-slate-800 leading-tight px-1">
          {data.name}
        </h3>
        <p
          className="text-xs font-medium mt-0.5 px-1 truncate max-w-[170px]"
          style={{ color: palette.text }}
        >
          {data.designation}
        </p>
        {data.department && (
          <p className="text-[10px] text-slate-400 mt-0.5">{data.department}</p>
        )}

        {(data.employee_code || !!data.subordinatesCount) && (
          <div className="flex items-center gap-1.5 mt-2">
            {data.employee_code && (
              <span className="text-[10px] font-mono bg-white/70 text-slate-500 px-2 py-0.5 rounded-full">
                {data.employee_code}
              </span>
            )}
            {!!data.subordinatesCount && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: palette.text }}
              >
                {data.subordinatesCount} Reports
              </span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
});

OrgNodeComponent.displayName = "OrgNodeComponent";