import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { createEmployeeSchema } from "@/app/validations/phase1_schema";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await getPool().connect();

  try {
    const authUser = await getAuthenticatedUser(request);
    const isHR = authUser.roles.includes("hr");
    let singleQuery = `
      SELECT   
        e.*,
        le.name AS legal_entity_name,
        bu.name AS business_unit_name,
        d.name AS department_name,
        des.title AS designation_title,
        loc.name AS location_name,
        s.name AS shift_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS reporting_manager_name,
        CONCAT(sm.first_name, ' ', sm.last_name) AS super_manager_name,
        row_to_json(ei.*) AS identities
      FROM employees e
      LEFT JOIN legal_entities le ON e.legal_entity_id = le.id
      LEFT JOIN business_units bu ON e.business_unit_id = bu.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN locations loc ON e.location_id = loc.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
      LEFT JOIN employees sm ON e.super_manager_id = sm.id
      LEFT JOIN employee_identities ei ON e.id = ei.employee_id
      WHERE e.id = $1;
    `;

    const queryParams: any[] = [id];
    if (!isHR) {
      singleQuery += ` AND e.keycloak_id = $2`;
      queryParams.push(authUser.sub);
    }

    const result = await client.query(singleQuery, queryParams);

    if (result.rows.length === 0) {
      return apiError("NOT_FOUND", "Employee not found or access denied", 404);
    }

    return ok(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching employee by ID:", error);
    return apiError("UNAUTHORIZED", error.message || "Failed to fetch employee", 401);
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser.roles.includes("hr")) {
      return apiError("FORBIDDEN", "You do not have permission to delete employee records", 403);
    }

    const { id } = await params;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        `UPDATE employees 
       SET 
         status='inactive', updated_at=NOW()
         WHERE id=$1
       RETURNING id
       `,       
        [id],
      );


      if (result.rows.length === 0) {
        return apiError("NOT_FOUND", "Employee not found", 404);
      }

      return ok({ id }, { message: "Employee deleted successfully" });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    return apiError("INTERNAL_ERROR", "Failed to delete employee", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
   
    const authUser = await getAuthenticatedUser(request);
    if (!authUser.roles.includes("hr")) {
      return apiError("FORBIDDEN", "You do not have permission to update employee records", 403);
    }

    const { id } = await params;
    const parsed = await parseJson(request, createEmployeeSchema);
    if (parsed.error) return parsed.error;

    const data = parsed.data;
    const keys = Object.keys(data);

    if (keys.length === 0) {
      return apiError("BAD_REQUEST", "No valid fields provided to update", 400);
    }

    const updatedRecord = await withTranscations(async (client) => {
      const setClause = keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
      const values = Object.values(data);
      const targetIdIndex = values.length + 1;
      const updateQuery = `
        UPDATE employees 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${targetIdIndex}
        RETURNING *;
      `;

      const result = await client.query(updateQuery, [...values, id]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    });
    if (!updatedRecord) {
      return apiError("NOT_FOUND", "Employee not found", 404);
    }
    return ok(updatedRecord, { message: "Employee updated successfully", success:true });
  } catch (error) {
    console.error("Error updating employee:", error);
    return apiError("INTERNAL_ERROR", "Failed to update employee", 500);
  }
}
