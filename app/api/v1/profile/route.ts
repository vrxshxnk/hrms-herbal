
import { getPool } from "@/app/lib/api/client";
import { apiError,ok } from "@/app/lib/api/response";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

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
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to fetch profile", 500);
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
    const body = await request.json();

    // Allowed fields jo user khud update kar sakta hai (Security rule: roles/departments update nahi honge)
    const {
      personal_email,
      mobile_number,
      alternate_mobile,
      current_address,
      permanent_address,
      city,
      state,
      country,
      postal_code,
      marital_status,
      nationality,
      preferred_language,
      display_name,
      profile_photo_url,
    } = body;

    const updateQuery = `
      UPDATE employees
      SET 
        personal_email = COALESCE($1, personal_email),
        mobile_number = COALESCE($2, mobile_number),
        alternate_mobile = COALESCE($3, alternate_mobile),
        current_address = COALESCE($4, current_address),
        permanent_address = COALESCE($5, permanent_address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        country = COALESCE($8, country),
        postal_code = COALESCE($9, postal_code),
        marital_status = COALESCE($10, marital_status),
        nationality = COALESCE($11, nationality),
        preferred_language = COALESCE($12, preferred_language),
        display_name = COALESCE($13, display_name),
        profile_photo_url = COALESCE($14, profile_photo_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *;
    `;

    const values = [
      personal_email || null,
      mobile_number || null,
      alternate_mobile || null,
      current_address || null,
      permanent_address || null,
      city || null,
      state || null,
      country || null,
      postal_code || null,
      marital_status || null,
      nationality || null,
      preferred_language || null,
      display_name || null,
      profile_photo_url || null,
      employeeId,
    ];

    const updateResult = await client.query(updateQuery, values);

    return ok({
      success: true,
      message: "Profile updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to update profile", 500);
  } finally {
    client.release();
  }
}