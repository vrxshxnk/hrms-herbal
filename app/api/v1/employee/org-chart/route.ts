import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

interface OrgNode {
  id: string;
  employee_code: string;
  name: string;
  designation: string;
  department: string;
  profile_photo_url: string | null;
  reporting_manager_id: string | null;
  subordinates: OrgNode[];
}

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const client = await getPool().connect();

  try {

    const query = `
      WITH RECURSIVE org_hierarchy AS (

        SELECT 
          e.id,
          e.employee_code,
          COALESCE(e.display_name, e.first_name || ' ' || e.last_name) as name,
          d.title as designation,
          dept.name as department,
          e.profile_photo_url,
          e.reporting_manager_id,
          1 as depth
        FROM employees e
        LEFT JOIN designations d ON e.designation_id = d.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        WHERE e.reporting_manager_id IS NULL AND e.status = 'active'

        UNION ALL


        SELECT 
          e.id,
          e.employee_code,
          COALESCE(e.display_name, e.first_name || ' ' || e.last_name) as name,
          d.title as designation,
          dept.name as department,
          e.profile_photo_url,
          e.reporting_manager_id,
          h.depth + 1
        FROM employees e
        INNER JOIN org_hierarchy h ON e.reporting_manager_id = h.id
        LEFT JOIN designations d ON e.designation_id = d.id
        LEFT JOIN departments dept ON e.department_id = dept.id
        WHERE e.status = 'active'
      )
      SELECT * FROM org_hierarchy ORDER BY depth, name;
    `;

    const result = await client.query(query);
    const rawNodes = result.rows;

    // Build hierarchical JSON tree structure
    const nodeMap = new Map<string, OrgNode>();
    const rootNodes: OrgNode[] = [];

    // Step 1: Instantiate nodes with empty children list
    rawNodes.forEach((row) => {
      nodeMap.set(row.id, {
        id: row.id,
        employee_code: row.employee_code,
        name: row.name,
        designation: row.designation || "N/A",
        department: row.department || "N/A",
        profile_photo_url: row.profile_photo_url,
        reporting_manager_id: row.reporting_manager_id,
        subordinates: [],
      });
    });

    // Step 2: Link direct reports to parent managers
    nodeMap.forEach((node) => {
      if (node.reporting_manager_id && nodeMap.has(node.reporting_manager_id)) {
        nodeMap.get(node.reporting_manager_id)!.subordinates.push(node);
      } else {
        rootNodes.push(node); // Top-level roots (e.g., CEO / Directors)
      }
    });

    return ok({
      success: true,
      data: rootNodes,
    });
  } catch (error) {
    console.error("Error fetching org chart hierarchy:", error);
    return apiError("INTERNAL_ERROR", "Failed to retrieve organizational structure", 500);
  } finally {
    client.release();
  }
}