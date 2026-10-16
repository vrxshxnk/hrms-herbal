import { apiError, ok } from "@/app/lib/api/response";
import { getPool, withTranscations } from "@/app/lib/api/client";
import { parseJson } from "@/app/lib/api/validation";
import { createEmployeeSchema } from "@/app/validations/phase1_schema";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import {createKeycloakUser,deleteKeycloakUser} from "../auth/keycloak/keycloak-admin";



const employeeStrategies = {
  // HR / Admin: Read all organization employees with optional filters
  "employee:read:all": (_actorId: string, searchParams: URLSearchParams) => {
    const status = searchParams.get("status") || "active";
    const departmentId = searchParams.get("department_id");
    const search = searchParams.get("search");

    let query = `
      SELECT
        e.id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.display_name, e.profile_photo_url, e.gender, e.work_email,
        e.department_id, e.designation_id, e.reporting_manager_id,
        e.mobile_number, e.keycloak_id, e.status, e.employment_type,
        e.joining_date, e.system_role,
        le.name AS legal_entity_name, bu.name AS business_unit_name,
        d.name AS department_name, des.title AS designation_title,
        loc.name AS location_name, s.name AS shift_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS reporting_manager_name
      FROM employees e
      LEFT JOIN legal_entities le ON e.legal_entity_id = le.id
      LEFT JOIN business_units bu ON e.business_unit_id = bu.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN locations loc ON e.location_id = loc.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (status) {
      params.push(status);
      query += ` AND e.status = $${idx++}`;
    }
    if (departmentId) {
      params.push(departmentId);
      query += ` AND e.department_id = $${idx++}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.employee_code ILIKE $${idx} OR e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.work_email ILIKE $${idx})`;
      idx++;
    }

    return { query, params };
  },

  // Manager / Super Manager: Read direct reports + super reports + self
  "employee:read:team": (actorId: string, searchParams: URLSearchParams) => {
    const status = searchParams.get("status") || "active";
    const search = searchParams.get("search");

    let query = `
      SELECT
        e.id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.display_name, e.profile_photo_url, e.gender, e.work_email,
        e.department_id, e.designation_id, e.reporting_manager_id,
        e.mobile_number, e.keycloak_id, e.status, e.employment_type,
        e.joining_date, e.system_role,
        le.name AS legal_entity_name, bu.name AS business_unit_name,
        d.name AS department_name, des.title AS designation_title,
        loc.name AS location_name, s.name AS shift_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS reporting_manager_name
      FROM employees e
      LEFT JOIN legal_entities le ON e.legal_entity_id = le.id
      LEFT JOIN business_units bu ON e.business_unit_id = bu.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN locations loc ON e.location_id = loc.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
      WHERE (e.reporting_manager_id = $1 OR e.super_manager_id = $1 OR e.id = $1)
    `;
    const params: any[] = [actorId];
    let idx = 2;

    if (status) {
      params.push(status);
      query += ` AND e.status = $${idx++}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.employee_code ILIKE $${idx} OR e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.work_email ILIKE $${idx})`;
      idx++;
    }

    return { query, params };
  },

  // Employee: Read self record only
  "employee:read:self": (actorId: string, searchParams: URLSearchParams) => {
    const search = searchParams.get("search");

    let query = `
      SELECT
        e.id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.display_name, e.profile_photo_url, e.gender, e.work_email,
        e.department_id, e.designation_id, e.reporting_manager_id,
        e.mobile_number, e.keycloak_id, e.status, e.employment_type,
        e.joining_date, e.system_role,
        le.name AS legal_entity_name, bu.name AS business_unit_name,
        d.name AS department_name, des.title AS designation_title,
        loc.name AS location_name, s.name AS shift_name,
        CONCAT(rm.first_name, ' ', rm.last_name) AS reporting_manager_name
      FROM employees e
      LEFT JOIN legal_entities le ON e.legal_entity_id = le.id
      LEFT JOIN business_units bu ON e.business_unit_id = bu.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN locations loc ON e.location_id = loc.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
      WHERE e.id = $1
    `;
    const params: any[] = [actorId];
    let idx = 2;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.employee_code ILIKE $${idx} OR e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.work_email ILIKE $${idx})`;
      idx++;
    }

    return { query, params };
  },
};

// 2. GET Endpoint Handler
export async function GET(request: Request) {
  const client = await getPool().connect();

  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.sub) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 50));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const offset = (page - 1) * limit;

    // Resolve Actor's internal employee ID from Keycloak sub
    const empRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authUser.sub]
    );
    if (empRes.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee record not found", 404);
    }
    const actorId = empRes.rows[0].id;
    const roles = (authUser.roles || []).map((r: string) => r.toLowerCase());

    // Determine Strategy Key based on Role priority
    let strategyKey: keyof typeof employeeStrategies = "employee:read:self";

    if (roles.some((r: string) => ["hr", "hradmin", "hr_admin", "admin", "system_admin"].includes(r))) {
      strategyKey = "employee:read:all";
    } else if (roles.some((r: string) => ["manager", "super_manager"].includes(r))) {
      strategyKey = "employee:read:team";
    }

    // Execute Strategy to build query and params
    const strategy = employeeStrategies[strategyKey];
    const { query: baseQuery, params } = strategy(actorId, searchParams);

    // Append Pagination to final query
    const listQuery = `${baseQuery} ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS filtered_results`;

    const [listResult, countResult] = await Promise.all([
      client.query(listQuery, [...params, limit, offset]),
      client.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return ok({
      success: true,
      data: listResult.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employees list:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch employee list", 500);
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  let createdKeycloakId: string | null = null;
  let temporaryPassword: string| null =null;

  try {
    const authUser = await getAuthenticatedUser(request);
    const isHR = authUser.roles.some((r) =>
      ["hr", "hradmin", "hr_admin"].includes(r.toLowerCase()),
    );

    if (!isHR) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to create employee records",
        403,
      );
    }

    const parsed = await parseJson(request, createEmployeeSchema);
    if (parsed.error) return parsed.error;

    const data = parsed.data;
    try {
      const {keycloakId, generatedPassword}  = await createKeycloakUser({
        username: data.work_email,
        email: data.work_email,
        firstName: data.first_name,
        lastName: data.last_name,
        roleName: "employee",
      });
      createdKeycloakId =  keycloakId;
      temporaryPassword = generatedPassword;
    } catch (kcError: any) {
      if (kcError.message?.startsWith("USER_EXISTS")) {
        return apiError(
          "CONFLICT",
          "An account with this email already exists in Keycloak",
          409,
        );
      }
      throw kcError;
    }

    const createdEmployee = await withTranscations(async (client) => {
      const insertEmployeeQuery = `
        INSERT INTO employees (
          keycloak_id,
          employee_code,
          first_name,
          middle_name,
          last_name,
          display_name,
          profile_photo_url,
          gender,
          date_of_birth,
          blood_group,
          marital_status,
          nationality,
          preferred_language,
          work_email,
          personal_email,
          mobile_number,
          alternate_mobile,
          current_address,
          permanent_address,
          city,
          state,
          country,
          postal_code,
          legal_entity_id,
          business_unit_id,
          department_id,
          designation_id,
          location_id,
          shift_id,
          cost_center,
          employee_category,
          reporting_manager_id,
          super_manager_id,
          employment_type,
          status,
          joining_date,
          confirmation_date,
          exit_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38
        )
        RETURNING *;
      `;

      const employeeValues = [
        createdKeycloakId,
        data.employee_code,
        data.first_name,
        data.middle_name || null,
        data.last_name,
        data.display_name || `${data.first_name} ${data.last_name}`,
        data.profile_photo_url || null,
        data.gender,
        data.date_of_birth,
        data.blood_group || null,
        data.marital_status,
        data.nationality || null,
        data.preferred_language || "english",
        data.work_email,
        data.personal_email || null,
        data.mobile_number,
        data.alternate_mobile || null,
        data.current_address || null,
        data.permanent_address || null,
        data.city || null,
        data.state || null,
        data.country || null,
        data.postal_code || null,
        data.legal_entity_id || null,
        data.business_unit_id || null,
        data.department_id || null,
        data.designation_id || null,
        data.location_id || null,
        data.shift_id || null,
        data.cost_center || null,
        data.employee_category || "staff",
        data.reporting_manager_id || null,
        data.super_manager_id || null,
        data.employment_type || "permanent",
        data.status || "active",
        data.joining_date,
        data.confirmation_date || null,
        data.exit_date || null,
      ];

      const empResult = await client.query(insertEmployeeQuery, employeeValues);
      const newEmployee = empResult.rows[0];

      if (data.identities) {
        const insertIdentitiesQuery = `
          INSERT INTO employee_identities (
            employee_id,
            aadhaar_number,
            pan_number,
            passport_number,
            passport_expiry_date,
            driving_licence,
            voter_id,
            other_government_id,
            work_permit_visa_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `;

        const identityValues = [
          newEmployee.id,
          data.identities.aadhaar_number || null,
          data.identities.pan_number || null,
          data.identities.passport_number || null,
          data.identities.passport_expiry_date || null,
          data.identities.driving_licence || null,
          data.identities.voter_id || null,
          data.identities.other_government_id || null,
          data.identities.work_permit_visa_details || null,
        ];

        await client.query(insertIdentitiesQuery, identityValues);
      }

      return newEmployee;
    });

    return ok(
      {
        ...createdEmployee,
        temporary_password: temporaryPassword
      },
      { success: true, message: "successfully created the employee" },
      201,
    );
  } catch (error: any) {
    if (createdKeycloakId) {
      await deleteKeycloakUser(createdKeycloakId);
    }
    console.error("Error creating employee:", error);
    return apiError("INTERNAL_ERROR", "Failed to create employee", 500);
  }
}
