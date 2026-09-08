import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request);
  const client = await getPool().connect();

  try {
    const empResult = await client.query(
      `SELECT 
             id 
             FROM employees 
             WHERE 
             keycloak_id = $1
             `,
      [authUser.sub],
    );
    const currentEmp = empResult.rows[0];

    if (!currentEmp) {
      return apiError("NOT_FOUND", "Employee profile not found", 404);
    }

    const notificationsResult = await client.query(
      `SELECT 
             id, 
             title, 
             message, 
             type, 
             entity_type, 
             reference_id, 
             is_read, 
             created_at
       FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [currentEmp.id],
    );

    return ok({
      success: true,
      data: notificationsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch notifications", 500);
  } finally {
    client.release();
  }
}
