"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { X, User } from "lucide-react";

import { OrgNodeComponent, TIER_PALETTE, type OrgTier } from "../components/OrgNode";
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
  work_email?: string;
  location?: string;
};

const NODE_WIDTH = 220;
const H_GAP = 40;
const LEVEL_HEIGHT = 170;

// leader = no manager above it, manager = has direct reports, ic = no direct reports
function getTier(node: APIOrgNode, depth: number): OrgTier {
  if (depth === 0) return "leader";
  if (node.subordinates && node.subordinates.length > 0) return "manager";
  return "ic";
}

export default function OrgChartPage() {
  const { token, user } = useAuth();

  const [rawData, setRawData] = useState<APIOrgNode[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const nodeMap = useMemo(() => {
    const map = new Map<string, APIOrgNode & { managerId: string | null }>();
    function walk(node: APIOrgNode, managerId: string | null) {
      map.set(node.id, { ...node, managerId });
      node.subordinates?.forEach((child) => walk(child, node.id));
    }
    rawData.forEach((root) => walk(root, null));
    return map;
  }, [rawData]);

  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;
  const selectedManager = selectedNode?.managerId ? nodeMap.get(selectedNode.managerId) : null;

  const buildFlow = useCallback(
    (rootNodes: APIOrgNode[]) => {
      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];
      const widthCache = new Map<string, number>();

      function computeWidth(node: APIOrgNode): number {
        if (widthCache.has(node.id)) return widthCache.get(node.id)!;
        const isCollapsed = collapsedIds.has(node.id);
        if (isCollapsed || !node.subordinates || node.subordinates.length === 0) {
          widthCache.set(node.id, NODE_WIDTH);
          return NODE_WIDTH;
        }
        const childrenWidth = node.subordinates.reduce((sum, child) => sum + computeWidth(child), 0);
        const totalGaps = (node.subordinates.length - 1) * H_GAP;
        const width = Math.max(NODE_WIDTH, childrenWidth + totalGaps);
        widthCache.set(node.id, width);
        return width;
      }

      function placeNode(node: APIOrgNode, leftX: number, depth: number, tierDepth: number) {
        const width = widthCache.get(node.id)!;
        const centerX = leftX + width / 2;
        const isCollapsed = collapsedIds.has(node.id);

        flowNodes.push({
          id: node.id,
          type: "orgNode",
          position: { x: centerX - NODE_WIDTH / 2, y: depth * LEVEL_HEIGHT },
          data: {
            id: node.id,
            name: node.name,
            designation: node.designation,
            department: node.department,
            employee_code: node.employee_code,
            profile_photo_url: node.profile_photo_url,
            subordinatesCount: node.subordinates?.length || 0,
            tier: getTier(node, tierDepth),
            isCurrentUser: !!user?.employeeId && node.id === user.employeeId,
            isSelected: node.id === selectedId,
            isCollapsed,
            onToggleCollapse: toggleCollapse,
            onSelect: setSelectedId,
          },
        });

        if (!isCollapsed && node.subordinates && node.subordinates.length > 0) {
          let cursorX = leftX;
          node.subordinates.forEach((child) => {
            const childWidth = widthCache.get(child.id)!;
            flowEdges.push({
              id: `e-${node.id}-${child.id}`,
              source: node.id,
              target: child.id,
              type: "smoothstep",
              style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
            });
            placeNode(child, cursorX, depth + 1, tierDepth + 1);
            cursorX += childWidth + H_GAP;
          });
        }
      }

      let virtualRootId: string | null = null;

      if (rootNodes.length > 1) {
        virtualRootId = "__org_root__";
        const virtualWidth =
          rootNodes.reduce((sum, r) => sum + computeWidth(r), 0) + (rootNodes.length - 1) * H_GAP;
        widthCache.set(virtualRootId, virtualWidth);

        flowNodes.push({
          id: virtualRootId,
          type: "orgNode",
          position: { x: 0, y: 0 },
          data: {
            id: virtualRootId,
            name: "Organization",
            designation: "All Departments",
            department: "",
            employee_code: "",
            profile_photo_url: null,
            subordinatesCount: rootNodes.length,
            tier: "leader" as OrgTier,
            isCurrentUser: false,
            isSelected: false,
            isCollapsed: false,
            onToggleCollapse: () => {},
            onSelect: () => {},
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
            type: "smoothstep",
            style: { stroke: "#e2e8f0", strokeWidth: 1.5, strokeDasharray: "4 4" },
          });
          placeNode(root, cursorX, 1, 0);
          cursorX += w + H_GAP;
        });

        const totalWidth = widthCache.get(virtualRootId)!;
        const rootNodeObj = flowNodes.find((n) => n.id === virtualRootId)!;
        rootNodeObj.position.x = totalWidth / 2 - NODE_WIDTH / 2;
        rootNodeObj.position.y = 0;
      } else {
        let cursorX = 0;
        rootNodes.forEach((root) => {
          const w = widthCache.get(root.id)!;
          placeNode(root, cursorX, 0, 0);
          cursorX += w + H_GAP;
        });
      }

      return { flowNodes, flowEdges };
    },
    [collapsedIds, selectedId, user, toggleCollapse],
  );

  useEffect(() => {
    if (rawData.length === 0) return;
    const { flowNodes, flowEdges } = buildFlow(rawData);
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [rawData, buildFlow, setNodes, setEdges]);

  useEffect(() => {
    if (!token) return;
    const fetchOrgChart = async () => {
      try {
        const res = await fetch("/api/v1/employee/org-chart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok && result.data) {
          setRawData(result.data?.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load org chart:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgChart();
  }, [token]);

  if (loading) {
    return (
      <div className="w-full h-[650px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="text-slate-500 font-medium animate-pulse">Loading Organizational Hierarchy...</div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full h-[calc(100vh-80px)] flex gap-4">
      <div className="flex-1 flex flex-col bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner relative">
        <div className="flex-1 relative">
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
            <MiniMap nodeColor="#316AFF" className="!bg-white !border-slate-200 !shadow-md" />
          </ReactFlow>
        </div>

        {/* Legend footer — matches the reference's tier key */}
        <div className="flex items-center gap-6 px-5 py-3 bg-white border-t border-slate-200 text-xs text-slate-500">
          {(Object.keys(TIER_PALETTE) as OrgTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TIER_PALETTE[tier].dot }}
              />
              {TIER_PALETTE[tier].label}
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="w-80 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Employee Details</span>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-5">
            {selectedNode.profile_photo_url ? (
              <img src={selectedNode.profile_photo_url} alt={selectedNode.name} className="w-16 h-16 rounded-full object-cover mb-3" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <User className="w-7 h-7 text-slate-400" />
              </div>
            )}
            <h2 className="font-semibold text-slate-900">{selectedNode.name}</h2>
            <p className="text-sm text-slate-500">{selectedNode.designation}</p>
            {selectedNode.department && <p className="text-xs text-slate-400 mt-1">{selectedNode.department}</p>}
          </div>

          <div className="space-y-4 text-sm">
            {selectedManager && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Reports to</p>
                <button onClick={() => setSelectedId(selectedManager.id)} className="text-slate-800 font-medium hover:text-emerald-600">
                  {selectedManager.name}
                </button>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1">Direct reports</p>
              <p className="text-slate-800 font-medium">
                {selectedNode.subordinates?.length ?? 0} team member{selectedNode.subordinates?.length === 1 ? "" : "s"}
              </p>
            </div>

            {selectedNode.location && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Location</p>
                <p className="text-slate-800">{selectedNode.location}</p>
              </div>
            )}

            {selectedNode.work_email && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Work email</p>
                <p className="text-slate-800 break-all">{selectedNode.work_email}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1">Employee code</p>
              <p className="text-slate-800 font-mono text-xs">{selectedNode.employee_code}</p>
            </div>

            {!!selectedNode.subordinates?.length && (
              <div>
                <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Direct Reports</p>
                <div className="space-y-2">
                  {selectedNode.subordinates.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedId(sub.id)}
                      className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg p-1.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-500 shrink-0">
                        {sub.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-slate-800 truncate">{sub.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{sub.designation}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}