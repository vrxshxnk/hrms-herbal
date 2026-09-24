import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export interface DBUserProfile {
  id: string;
  employee_code: string;
  keycloak_id: string;
  work_email: string;
  system_role: string;
  department_id: string | null;
  location_id?: string | null;
  legal_entity_id?: string | null;
}

export async function getDBUserProfile(request: Request): Promise<DBUserProfile | null> {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser || !authUser.sub) return null;

  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT
         id,
         employee_code,
         keycloak_id,
         work_email,
         department_id,
         location_id,
         legal_entity_id
       FROM employees
       WHERE keycloak_id = $1 AND status = 'active'`,
      [authUser.sub]
    );

    if (result.rows.length === 0) return null;
    const roles: string[] = authUser.roles;
    let system_role = "employee";
    if (roles.includes("admin")) {
      system_role = "admin";
    } else if (roles.includes("manager")) {
      system_role = "manager";
    } else if (roles.includes("hr")) {
      system_role = "hr";
    }

    return {
      ...result.rows[0],
      system_role,
    } as DBUserProfile;
  } finally {
    client.release();
  }
}
