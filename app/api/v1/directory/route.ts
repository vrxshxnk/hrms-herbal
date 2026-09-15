import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function GET(request: Request) {
  const client = await getPool().connect();
  try {
    const authuser = await getAuthenticatedUser(request);
    if (!authuser) {
      return apiError("UNAUTHORIZED", "Failed to get the user!", 401);
    }

    const query = `
      SELECT
        e.id,
        e.keycloak_id,
        e.display_name,
        e.work_email,
        e.profile_photo_url,
        d.name AS department_name,
        des.title AS designation_title
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE e.status = 'active'
        AND e.keycloak_id IS NOT NULL
        AND e.keycloak_id != $1
      ORDER BY e.display_name ASC
    `;

    const result = await client.query(query, [authuser.sub]);

    return ok({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching directory:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch directory", 500);
  } finally {
    client.release();
  }
}
