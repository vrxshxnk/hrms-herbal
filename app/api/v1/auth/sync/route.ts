import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const client = await getPool().connect();
  try {
    const claims = await getAuthenticatedUser(request);
    const keycloak_id = claims.sub;
    const email = claims.email;
    if (!keycloak_id || !email) {
      return apiError(
        "BAD_REQUEST",
        "Required user information missing from token",
        400,
      );
    }
    const userRoles = claims.roles ?? [];
    const keycloak_role = userRoles.includes("hr")
      ? "hr"
      : userRoles.includes("employee")
        ? "employee"
        : userRoles[0] || "employee";

    let employee;
    const byKeycloakId = await client.query(
      `
        SELECT
          id,
          keycloak_id,
          system_role,
          work_email,
          first_name,
          last_name
        FROM employees
        WHERE keycloak_id = $1
        LIMIT 1;
      `,
      [keycloak_id],
    );

    employee = byKeycloakId.rows[0];

    if (!employee) {
      return apiError(
        "NOT_FOUND",
        "Employee record not found in DB. Please contact HR.",
        404,
      );
    }

    if (!employee) {
      const byEmail = await client.query(
        `
          SELECT
            id,
            keycloak_id,
            system_role,
            work_email,
            first_name,
            last_name
          FROM employees
          WHERE work_email = $1
          LIMIT 1;
        `,
        [email],
      );
      employee = byEmail.rows[0];
    }

    if (!employee) {
      return apiError(
        "NOT_FOUND",
        "Employee record not found in DB. Please contact HR.",
        404,
      );
    }
    const needsKeycloakIdUpdate =
      !employee.keycloak_id || employee.keycloak_id !== keycloak_id;
    const needsRoleUpdate =
      keycloak_role && employee.system_role !== keycloak_role;
    let finalEmployee = employee;

    if (needsKeycloakIdUpdate || needsRoleUpdate) {
      finalEmployee = await withTranscations(async (txClient) => {
        const updateQuery = `
            UPDATE employees
            SET
              keycloak_id = $1,
              system_role = COALESCE($2, system_role),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING
              id,
              keycloak_id,
              system_role,
              work_email,
              first_name,
              last_name;
          `;

        const updateResult = await txClient.query(updateQuery, [
          keycloak_id,
          keycloak_role || null,
          employee.id,
        ]);

        return updateResult.rows[0];
      });
    }

    const cookieStore = await cookies();
    cookieStore.set("user_role", finalEmployee.system_role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return ok({
      message: "User synced successfully",
      employee: finalEmployee,
    });
  } catch (error) {
    console.error("Error syncing user with Keycloak:", error);
    return apiError("INTERNAL_ERROR", "Failed to sync user details", 500);
  } finally {
    client.release();
  }
}
