import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser.roles.includes("hr")) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to update FAQ queries",
        403
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status values against schema constraints
    const validStatuses = ["pending", "in_review", "resolved", "closed"];
    if (!status || !validStatuses.includes(status)) {
      return apiError(
        "BAD_REQUEST",
        "Invalid status. Must be one of: pending, in_review, resolved, closed",
        400
      );
    }

    const client = await getPool().connect();

    try {
      const updateQuery = `
        UPDATE faq_queries
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `;

      const result = await client.query(updateQuery, [status, id]);
      if (result.rows.length === 0) {
        return apiError("NOT_FOUND", "FAQ query not found", 404);
      }

      return ok(result.rows[0], {
        message: "FAQ query status updated successfully",
        success: true,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating FAQ query status:", error);
    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to update FAQ query status",
      500
    );
  }
}