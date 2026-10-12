import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function GET(request: Request) {
  const client = await getPool().connect();
  try {
      const authuser= await getAuthenticatedUser(request);
      const roles = authuser.roles || [];
    if (!roles.includes("hr") && !roles.includes("admin")) {
      return apiError("FORBIDDEN", "Only HR or Admin can check leave types.", 403);
    }
    const query = `
      SELECT 
        id,
        code,
        name,
        is_paid,
        max_days_per_year,
        created_at
      FROM leave_types
      ORDER BY name ASC;
    `;
    const result = await client.query(query);
    return ok({
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch leave types", 500);
  } finally {
    client.release();
  }
}