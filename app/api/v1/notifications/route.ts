import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";


export async function GET(request: Request) {
  const client = await getPool().connect();
  try {
    const authuser = await getAuthenticatedUser(request);

    // 1. Get Employee ID from Keycloak ID
    const empRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authuser.sub]
    );

    if (empRes.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee profile not found.", 404);
    }

    const employeeId = empRes.rows[0].id;

    // 2. Fetch Notifications List
    const listQuery = `
      SELECT id, title, message, type, reference_id, reference_type, is_read, created_at
      FROM notifications
      WHERE recipient_id = $1
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    // 3. Unread Count
    const countQuery = `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE recipient_id = $1 AND is_read = false;
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listQuery, [employeeId]),
      client.query(countQuery, [employeeId]),
    ]);

    return ok({
      notifications: listResult.rows,
      unread_count: parseInt(countResult.rows[0].unread_count, 10),
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to fetch notifications", 500);
  } finally {
    client.release();
  }
}


export async function PATCH(request: Request) {
  const client = await getPool().connect();
  try {
    const authuser = await getAuthenticatedUser(request);
    const body = await request.json();
    const { notification_id, mark_all_read } = body;

    const empRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authuser.sub]
    );

    if (empRes.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee profile not found.", 404);
    }

    const employeeId = empRes.rows[0].id;

    if (mark_all_read) {
      await client.query(
        `UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false`,
        [employeeId]
      );
      return ok({ message: "All notifications marked as read." });
    }

    if (notification_id) {
      await client.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2`,
        [notification_id, employeeId]
      );
      return ok({ message: "Notification marked as read." });
    }

    return apiError("BAD_REQUEST", "Provide 'notification_id' or 'mark_all_read: true'.", 400);
  } catch (error: any) {
    console.error("Error updating notifications:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to update notification", 500);
  } finally {
    client.release();
  }
}