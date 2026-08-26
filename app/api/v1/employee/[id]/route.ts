import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";





export async function GET(request : Request, {params}:{params: Promise<{id:string}>}){
      const {id}= await params;
      const client = await getPool().connect();
      try {
        const singleQuery= `
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

        const result = await client.query(singleQuery,[id]);
        if (result.rows.length === 0) {
            return apiError("NOT_FOUND", "Employee not found", 404);
        }
         return ok(result.rows[0]);
      } catch (error) {
         console.error("Error fetching employee by ID:", error);
         return apiError("INTERNAL_ERROR", "Failed to fetch employee", 500);
      }finally {
         client.release();
       }
}


export async function DELETE(request: Request, { params }: {params: Promise<{id:string}>}) {
  const { id } = await params;
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `DELETE FROM employees WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return apiError("NOT_FOUND", "Employee not found", 404);
    }

    return ok({ id }, { message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return apiError("INTERNAL_ERROR", "Failed to delete employee", 500);
  } finally {
    client.release();
  }
}