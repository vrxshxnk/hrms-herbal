import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
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
    const query = `SELECT id, code , name, created_at
             FROM departments 
             ORDER BY name ASC
             ;`;
    const result = await client.query(query);
    return ok({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch departments", 500);
  } finally {
    client.release();
  }
}
