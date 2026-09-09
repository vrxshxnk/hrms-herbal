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
};

export const OrgNodeComponent = memo(({ data }: { data: OrgNodeData }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md p-4 min-w-[240px] text-slate-800 transition-all hover:shadow-lg hover:border-blue-400">
      {/* Top Handle for Incoming Manager Link */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3"
      />

      <div className="flex items-center gap-3">
        {data.profile_photo_url ? (
          <img
            src={data.profile_photo_url}
            alt={data.name}
            className="w-11 h-11 rounded-full object-cover border border-slate-100"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
        )}

        <div className="overflow-hidden">
          <h3 className="font-semibold text-sm truncate text-slate-900">
            {data.name}
          </h3>
          <p className="text-xs text-blue-600 font-medium truncate">
            {data.designation}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {data.department}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
          {data.employee_code}
        </span>
        {data.subordinatesCount ? (
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
            {data.subordinatesCount} Reports
          </span>
        ) : null}
      </div>

      {/* Bottom Handle for Outgoing Subordinate Links */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3"
      />
    </div>
  );
});

OrgNodeComponent.displayName = "OrgNodeComponent";