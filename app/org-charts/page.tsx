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
  keycloak_id?: string;
  subordinates: APIOrgNode[];
};

const NODE_WIDTH = 240;
const H_GAP = 40; // horizontal gap between sibling subtrees
const LEVEL_HEIGHT = 200; // vertical distance between generations — gives curves room to arc

function edgeStrokeForDepth(depth: number) {
  // thicker near the root ("trunk"), thinner further out ("twigs")
  return Math.max(1.5, 3 - depth * 0.4);
}

export default function OrgChartPage() {
  const { token, user } = useAuth();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);

  const transformTreeToFlow = useCallback(
    (rootNodes: APIOrgNode[]) => {
      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];

      // Pass 1: compute the width each subtree needs, bottom-up.
      // A leaf needs just its own card width. A parent needs the sum
      // of its children's widths (plus gaps between them).
      const widthCache = new Map<string, number>();

      function computeWidth(node: APIOrgNode): number {
        if (widthCache.has(node.id)) return widthCache.get(node.id)!;

        if (!node.subordinates || node.subordinates.length === 0) {
          widthCache.set(node.id, NODE_WIDTH);
          return NODE_WIDTH;
        }

        const childrenWidth = node.subordinates.reduce(
          (sum, child) => sum + computeWidth(child),
          0,
        );
        const totalGaps = (node.subordinates.length - 1) * H_GAP;
        const width = Math.max(NODE_WIDTH, childrenWidth + totalGaps);

        widthCache.set(node.id, width);
        return width;
      }

      // Pass 2: assign actual x/y using the precomputed widths, top-down.
      // Each node is centered over the combined width of its own subtree.
      function placeNode(node: APIOrgNode, leftX: number, depth: number) {
        const width = widthCache.get(node.id)!;
        const centerX = leftX + width / 2;

        flowNodes.push({
          id: node.id,
          type: "orgNode",
          position: { x: centerX - NODE_WIDTH / 2, y: depth * LEVEL_HEIGHT },
          data: {
            name: node.name,
            designation: node.designation,
            department: node.department,
            employee_code: node.employee_code,
            profile_photo_url: node.profile_photo_url,
            subordinatesCount: node.subordinates?.length || 0,
            isCurrentUser: !!user?.employeeId && node.id === user.employeeId,
          },
        });

        if (node.subordinates && node.subordinates.length > 0) {
          let cursorX = leftX;
          node.subordinates.forEach((child) => {
            const childWidth = widthCache.get(child.id)!;

            flowEdges.push({
              id: `e-${node.id}-${child.id}`,
              source: node.id,
              target: child.id,
              type: "default", // bezier curve — branch-like, not right-angled
              animated: false,
              style: {
                stroke: "#94a3b8",
                strokeWidth: edgeStrokeForDepth(depth),
              },
            });

            placeNode(child, cursorX, depth + 1);
            cursorX += childWidth + H_GAP;
          });
        }
      }

      // If the API gives us multiple disconnected top-level managers
      // (one per department, no shared manager), wrap them under a
      // single virtual root so the whole thing reads as one tree
      // instead of several unrelated charts side by side.
      let virtualRootId: string | null = null;

      if (rootNodes.length > 1) {
        virtualRootId = "__org_root__";
        const virtualWidth =
          rootNodes.reduce((sum, r) => sum + computeWidth(r), 0) +
          (rootNodes.length - 1) * H_GAP;
        widthCache.set(virtualRootId, virtualWidth);

        flowNodes.push({
          id: virtualRootId,
          type: "orgNode",
          position: { x: 0, y: 0 }, // fixed up after placing children
          data: {
            name: "Organization",
            designation: "All Departments",
            department: "",
            employee_code: "",
            profile_photo_url: null,
            subordinatesCount: rootNodes.length,
            isCurrentUser: false,
          },
        });
      } else {
        rootNodes.forEach((r) => computeWidth(r));
      }

      if (virtualRootId) {
        let cursorX = 0;
        rootNodes.forEach((root) => {
          const w = widthCache.get(root.id)!;
          flowEdges.push({
            id: `e-${virtualRootId}-${root.id}`,
            source: virtualRootId,
            target: root.id,
            type: "default",
            style: {
              stroke: "#cbd5e1",
              strokeWidth: edgeStrokeForDepth(0),
              strokeDasharray: "4 4",
            },
          });
          placeNode(root, cursorX, 1);
          cursorX += w + H_GAP;
        });

        // Now center the virtual root over everything placed under it
        const totalWidth = widthCache.get(virtualRootId)!;
        const rootNodeObj = flowNodes.find((n) => n.id === virtualRootId)!;
        rootNodeObj.position.x = totalWidth / 2 - NODE_WIDTH / 2;
        rootNodeObj.position.y = 0;
      } else {
        let cursorX = 0;
        rootNodes.forEach((root) => {
          const w = widthCache.get(root.id)!;
          placeNode(root, cursorX, 0);
          cursorX += w + H_GAP;
        });
      }

      return { flowNodes, flowEdges };
    },
    [user],
  );

  useEffect(() => {
    if (!token) return;

    const fetchOrgChart = async () => {
      try {
        const res = await fetch("/api/v1/employee/org-chart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (res.ok && result.data) {
          const { flowNodes, flowEdges } = transformTreeToFlow(
            result.data?.data,
          );
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
          fitViewOptions={{ padding: 0.3 }}
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