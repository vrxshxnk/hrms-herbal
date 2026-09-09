"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";


import { OrgNodeComponent } from "../components/OrgNode";
import { useAuth } from "@/app/context/AuthContext";

const nodeTypes = {
  orgNode: OrgNodeComponent,
};

type APIOrgNode = {
  id: string;
  employee_code: string;
  name: string;
  designation: string;
  department: string;
  profile_photo_url: string | null;
  reporting_manager_id: string | null;
  subordinates: APIOrgNode[];
};

export default function OrgChartPage() {
  const { token } = useAuth();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);

  const transformTreeToFlow = useCallback((rootNodes: APIOrgNode[]) => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const processNode = (
      node: APIOrgNode,
      x: number,
      y: number,
      levelWidth: number
    ) => {
      flowNodes.push({
        id: node.id,
        type: "orgNode",
        position: { x, y },
        data: {
          name: node.name,
          designation: node.designation,
          department: node.department,
          employee_code: node.employee_code,
          profile_photo_url: node.profile_photo_url,
          subordinatesCount: node.subordinates?.length || 0,
        },
      });

      if (node.subordinates && node.subordinates.length > 0) {
        const totalSubordinates = node.subordinates.length;
        const spacing = 280;
        const startX = x - ((totalSubordinates - 1) * spacing) / 2;

        node.subordinates.forEach((sub, index) => {
          const childX = startX + index * spacing;
          const childY = y + 160;

          flowEdges.push({
            id: `e-${node.id}-${sub.id}`,
            source: node.id,
            target: sub.id,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          });

          processNode(sub, childX, childY, spacing);
        });
      }
    };

    rootNodes.forEach((root, i) => {
      processNode(root, i * 600, 50, 600);
    });

    return { flowNodes, flowEdges };
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchOrgChart = async () => {
      try {
        const res = await fetch("/api/v1/employee/org-chart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (res.ok && result.data) {
          const { flowNodes, flowEdges } = transformTreeToFlow(result.data?.data);
          setNodes(flowNodes);
          setEdges(flowEdges);
        }
      } catch (err) {
        console.error("Failed to load org chart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgChart();
  }, [token, transformTreeToFlow, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="w-full h-[650px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="text-slate-500 font-medium animate-pulse">
          Loading Organizational Hierarchy...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full h-[calc(100vh-80px)]">
      <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="!bg-white !border-slate-200 !shadow-md" />
          <MiniMap
            nodeColor="#316AFF"
            className="!bg-white !border-slate-200 !shadow-md"
          />
        </ReactFlow>
      </div>
    </div>
  );
}