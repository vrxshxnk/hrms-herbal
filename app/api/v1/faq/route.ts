import { apiError, ok } from "@/app/lib/api/response";
import { faqQueryInputSchema } from "@/app/validations/phase1_schema";
import { parseJson } from "@/app/lib/api/validation";
import { getPool, withTranscations } from "@/app/lib/api/client";
import { getDBUserProfile } from "../auth/user-profile/route";

export async function GET(request: Request) {
  let client;
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User Profile not found or inactive!", 401);
    }

    if (user.system_role !== "hr") {
      return apiError("FORBIDDEN", "You are not authorized for this!", 403);
    }


    const getQuery = `
      SELECT * 
      FROM faq_queries 
      ORDER BY created_at DESC;
    `;

    client = await getPool().connect();
    const result = await client.query(getQuery);
    return ok({ data: result.rows, success: true });
  } catch (error: any) {
    console.error("Error fetching FAQ queries:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch FAQ queries", 500);
  } finally {
    if (client) client.release();
  }
}

export async function POST(request: Request) {
  try {
    const parsed = await parseJson(request, faqQueryInputSchema);
    if (parsed.error) return parsed.error;

    const { name, email, subject, question } = parsed.data;

    const newQuery = await withTranscations(async (client) => {
      const insertQuery = ` 
        INSERT INTO faq_queries (
          name,
          email,
          subject,
          question
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *; 
      `;
      const values = [name || null, email, subject, question];

      const res = await client.query(insertQuery, values);
      return res.rows[0];
    });

    return ok({ data: newQuery, success: true });
  } catch (error: any) {
    console.error("Error while creating FAQ query:", error);
    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to submit FAQ query",
      500,
    );
  }
}