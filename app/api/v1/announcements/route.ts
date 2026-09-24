



import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";
import { createAnnouncementSchema } from "@/app/validations/phase1_schema";

const announcementStrategies = {
  // 1. HR / System Admin / Super Admin: Reads ALL announcements (published, draft, or expired)
  "announcement:read:all": (_user: any) => ({
    query: `
      SELECT 
        a.*,
        e.first_name AS author_first_name,
        e.last_name AS author_last_name,
        e.display_name AS author_display_name,
        d.name AS target_department_name,
        l.name AS target_location_name,
        le.name AS target_legal_entity_name
      FROM announcements a
      JOIN employees e ON a.publisher_id = e.id
      LEFT JOIN departments d ON a.target_department_id = d.id
      LEFT JOIN locations l ON a.target_location_id = l.id
      LEFT JOIN legal_entities le ON a.target_legal_entity_id = le.id
      ORDER BY a.published_at DESC
    `,
    params: [] as any[],
  }),

  // 2. Manager / Employee: Filtered by user's department, location, legal entity + global announcements
  "announcement:read:scoped": (user: any) => ({
    query: `
      SELECT 
        a.*,
        e.first_name AS author_first_name,
        e.last_name AS author_last_name,
        e.display_name AS author_display_name,
        d.name AS target_department_name,
        l.name AS target_location_name,
        le.name AS target_legal_entity_name
      FROM announcements a
      JOIN employees e ON a.publisher_id = e.id
      LEFT JOIN departments d ON a.target_department_id = d.id
      LEFT JOIN locations l ON a.target_location_id = l.id
      LEFT JOIN legal_entities le ON a.target_legal_entity_id = le.id
      WHERE a.is_published = TRUE
        AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
        AND (
          -- Global broadcast (visible to everyone)
          (a.target_department_id IS NULL AND a.target_location_id IS NULL AND a.target_legal_entity_id IS NULL)
          -- Targeted matches for current logged-in user
          OR (a.target_department_id = $1)
          OR (a.target_location_id = $2)
          OR (a.target_legal_entity_id = $3)
        )
      ORDER BY a.published_at DESC
    `,
    params: [user.department_id, user.location_id, user.legal_entity_id],
  }),
};

export async function GET(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    }

    let strategyFn: (user: any) => { query: string; params: any[] };

    if (user.system_role === "hr" || user.system_role === "hr_admin" || user.system_role === "system_admin") {
      strategyFn = announcementStrategies["announcement:read:all"];
    } else {
      strategyFn = announcementStrategies["announcement:read:scoped"];
    }

    const { query, params } = strategyFn(user);

    const client = await getPool().connect();
    try {
      const result = await client.query(query, params);
      return ok({ data: result.rows, success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Announcement Fetch Error:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to fetch announcements", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    }

    // 1. Only HR, Admins, and Managers are permitted to create announcements
    const allowedRoles = ["hr", "hr_admin", "system_admin", "manager", "super_manager"];
    if (!allowedRoles.includes(user.system_role)) {
      return apiError("FORBIDDEN", "You do not have permission to publish announcements", 403);
    }

    // 2. Validate Body
    const parsed = await parseJson(request, createAnnouncementSchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const isHR = ["hr", "hr_admin", "system_admin"].includes(user.system_role);

    // 3. Department Managers can only target their own department or leave target blank for their team
    let targetDept = data.target_department_id || null;
    let targetLoc = data.target_location_id || null;
    let targetEntity = data.target_legal_entity_id || null;

    if (!isHR) {
      // Force non-HR managers to publish strictly to their own assigned department
      targetDept = user.department_id;
    }

    // 4. Save Record
    const newAnnouncement = await withTranscations(async (client) => {
      const insertQuery = `
        INSERT INTO announcements (
          title,
          content,
          priority,
          publisher_id,
          target_legal_entity_id,
          target_department_id,
          target_location_id,
          expires_at,
          is_published
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;

      const values = [
        data.title,
        data.content,
        data.priority || "medium",
        user.id,
        targetEntity,
        targetDept,
        targetLoc,
        data.expires_at || null,
        data.is_published ?? true,
      ];

      const res = await client.query(insertQuery, values);
      return res.rows[0];
    });

    return ok({ data: newAnnouncement, success: true });
  } catch (error: any) {
    console.error("Error while creating announcement:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to create announcement", 500);
  }
}
