import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";

export async function GET(request: Request) {
  const client = await getPool().connect();
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    const totalEmpRes = await client.query(
      `SELECT COUNT(*) AS count FROM employees WHERE status = 'active'`,
    );

    const newEmpRes = await client.query(
      `SELECT COUNT(*) AS count FROM employees WHERE status = 'active' AND joining_date >= NOW() - INTERVAL '30 days'`,
    );

    // 3. Employees On Leave Today
    const onLeaveRes = await client.query(
      `SELECT COUNT(DISTINCT employee_id) AS count FROM leave_requests WHERE status = 'Approved' AND CURRENT_DATE BETWEEN start_date AND end_date`,
    );

    // 4. Pending Leave Requests (for manager/HR overview)
    const pendingLeavesRes = await client.query(
      `SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'Pending'`,
    );

    // 5. Pending Reimbursements
    const pendingReimbRes = await client.query(
      `SELECT COUNT(*) AS count FROM reimbursement_requests WHERE status = 'Pending'`,
    );

    return ok({
      success: true,
      stats: {
        totalEmployees: parseInt(totalEmpRes.rows[0].count, 10),
        newEmployees: parseInt(newEmpRes.rows[0].count, 10),
        onLeave: parseInt(onLeaveRes.rows[0].count, 10),
        pendingLeaves: parseInt(pendingLeavesRes.rows[0].count, 10),
        pendingReimbursements: parseInt(pendingReimbRes.rows[0].count, 10),
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats fetch error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch dashboard stats", 500);
  } finally {
    client.release();
  }
}
