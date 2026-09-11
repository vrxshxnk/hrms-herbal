
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export interface DBUserProfile {
  id: string; 
  employee_code: string;
  keycloak_id: string;
  work_email: string;
  system_role: string; 
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
             system_role 
       FROM employees 
       WHERE keycloak_id = $1 AND status = 'active'
       `,
      [authUser.sub]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as DBUserProfile;
  } finally {
    client.release();
  }
}