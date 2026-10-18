
import { getPool } from "@/app/lib/api/client";
import { apiError,ok } from "@/app/lib/api/response";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { parseJson } from "@/app/lib/api/validation";
import { z } from "zod";

const profileUpdateSchema = z.object({
  personal_email: z.union([z.email().max(200), z.literal("")]).optional(),
  mobile_number: z.string().trim().min(8, "A valid mobile number is required").max(20).optional(),
  alternate_mobile: z.string().max(20).optional(),
  current_address: z.string().max(2000).optional(),
  permanent_address: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  marital_status: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  nationality: z.string().max(100).optional(),
  preferred_language: z.string().max(50).optional(),
  display_name: z.string().max(200).optional(),
  profile_photo_url: z.string().max(3_000_000).refine((value) =>
    !value || /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value),
    "Profile photo must be an image URL or supported image upload",
  ).optional(),
}).strict();

export async function GET(request: Request) {
  const client = await getPool().connect();

  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.sub) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    const query = `
      SELECT
        e.id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.display_name, e.profile_photo_url, e.gender, e.date_of_birth,
        e.blood_group, e.keycloak_id, e.marital_status, e.nationality,
        e.preferred_language, e.work_email, e.personal_email, e.mobile_number,
        e.alternate_mobile, e.current_address, e.permanent_address, e.city,
        e.state, e.country, e.postal_code, e.cost_center, e.employee_category,
        e.employment_type, e.status, e.joining_date, e.confirmation_date,
        e.exit_date, e.system_role,
        le.name AS legal_entity_name, bu.name AS business_unit_name,
        d.name AS department_name, des.title AS designation_title,
        loc.name AS location_name, s.name AS shift_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS reporting_manager_name,
        CONCAT(sm.first_name, ' ', sm.last_name) AS super_manager_name
      FROM employees e
      LEFT JOIN legal_entities le ON e.legal_entity_id = le.id
      LEFT JOIN business_units bu ON e.business_unit_id = bu.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN locations loc ON e.location_id = loc.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
      LEFT JOIN employees sm ON e.super_manager_id = sm.id
      WHERE e.keycloak_id = $1
      LIMIT 1;
    `;

    const result = await client.query(query, [authUser.sub]);

    if (result.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee profile record not found", 404);
    }

    return ok({
      success: true,
      data: result.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch profile", 500);
  } finally {
    client.release();
  }
}

// 2. PUT / PATCH: Update User Profile Details (Personal, Contact, Address)
export async function PUT(request: Request) {
  const client = await getPool().connect();

  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.sub) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    // Pehle internal employee ID nikal lo
    const empRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authUser.sub]
    );

    if (empRes.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee profile record not found", 404);
    }

    const employeeId = empRes.rows[0].id;
    const parsed = await parseJson(request, profileUpdateSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    // Keys come exclusively from the strict allowlist above. Omitted fields stay
    // unchanged; explicitly empty optional fields are cleared.
    const entries = Object.entries(body).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return apiError("BAD_REQUEST", "No profile changes provided", 400);
    }
    const assignments = entries.map(([key], index) => `"${key}" = $${index + 1}`);
    const values = entries.map(([, value]) => value === "" ? null : value);
    values.push(employeeId);
    const updateQuery = `
      UPDATE employees
      SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const updateResult = await client.query(updateQuery, values);

    return ok({
      success: true,
      message: "Profile updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating user profile:", error);
    return apiError("INTERNAL_ERROR", "Failed to update profile", 500);
  } finally {
    client.release();
  }
}
