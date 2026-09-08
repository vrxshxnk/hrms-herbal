import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function GET(request: Request) {
  const client = await getPool().connect();

  try {
    const authUser = await getAuthenticatedUser(request);
    const isHR = authUser.roles.some((r) =>
      ["hr", "hradmin", "hr_admin"].includes(r.toLowerCase()),
    );
    if (!isHR) {
      return apiError(
        "FORBIDDEN",
        "You do not have access to master data",
        403,
      );
    }
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("department_id");

    let query = `
      SELECT id, department_id, code, title, grade_level, created_at 
      FROM designations
    `;
    const queryParams: any[] = [];

    if (departmentId) {
      query += ` WHERE department_id = $1`;
      queryParams.push(departmentId);
    }
    query += ` ORDER BY title ASC;`;
    const result = await client.query(query, queryParams);
    return ok({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching designations:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch designations", 500);
  } finally {
    client.release();
  }
}
