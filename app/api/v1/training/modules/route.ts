import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";
import { createTrainingModuleSchema } from "@/app/validations/phase1_schema";

const moduleStrategy = {
  "module:read:all": (user: any) => ({
    query: `
            SELECT tm.* 
            FROM training_modules tm
            ORDER BY tm.created_at DESC
        `,
    params: [] as any[],
  }),

  "module:read:scoped": (user: any) => ({
    query: ` 
            SELECT tm.* 
            FROM training_modules tm 
            WHERE tm.is_active = true
            ORDER BY tm.created_at DESC
        `,
    params: [],
  }),
};

export async function GET(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError(
        "UNAUTHORIZED",
        "User profile do not exist or is inactive!",
        401,
      );
    }

    let strategyFn: (user: any) => { query: string; params: any[] };
    if (user.system_role === "hr" || user.system_role === "admin") {
      strategyFn = moduleStrategy["module:read:all"];
    } else {
      strategyFn = moduleStrategy["module:read:scoped"];
    }
    const { query, params } = strategyFn(user);
    const pool = getPool();
    const result = await pool.query(query, params);
    return ok({ data: result.rows, success: true });
  } catch (error: any) {
    console.error("Module fetch error:", error);
    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to fetch modules",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError(
        "UNAUTHORIZED",
        "User profile does not exist or is inactive!",
        401,
      );
    }

    if (user.system_role !== "hr" && user.system_role !== "admin") {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to create training modules",
        403,
      );
    }

    const validationResult = await parseJson(
      request,
      createTrainingModuleSchema,
    );
    if (validationResult.error) {
      console.log(validationResult.error);
      return apiError("BAD_REQUEST", "Error while fetching the body", 400);
    }

    const data = validationResult.data;
    const pool = getPool();

    const query = `
            INSERT INTO training_modules (
                code, title, description, category, video_url, video_provider,
                thumbnail_url, duration_seconds, completion_threshold,
                requires_acknowledgement, is_mandatory, is_active, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *;
        `;

    const params = [
      data.code.trim(),
      data.title.trim(),
      data.description || null,
      data.category,
      data.video_url.trim(),
      data.video_provider,
      data.thumbnail_url || null,
      data.duration_seconds,
      data.completion_threshold,
      data.requires_acknowledgement,
      data.is_mandatory,
      data.is_active,
      user.id || null,
    ];

    const result = await pool.query(query, params);

    return ok({
      data: result.rows[0],
      success: true,
      message: "Training module created successfully",
    });
  } catch (error: any) {
    console.error("Module creation error:", error);
    if (error.code === "23505") {
      return apiError(
        "CONFLICT",
        "A training module with this code already exists.",
        409,
      );
    }
    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to create training module",
      500,
    );
  }
}
