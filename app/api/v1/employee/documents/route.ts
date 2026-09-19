import { promises as fs } from "fs";
import path from "path";
import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";


type AccessDecision = {
  allowed: boolean;
  reason?: string;
};

type Actor = {
  id: string; // Database Employee ID
  keycloak_id: string;
  roles: string[];
};

type TargetEmployee = {
  id: string; // Target Employee DB ID
  keycloak_id: string;
  reporting_manager_id?: string | null;
};

interface PermissionStrategy {
  canUploadDocument(actor: Actor, targetEmployee: TargetEmployee): AccessDecision;
}

// 2. Permission Strategy Implementations
class SelfServiceUploadStrategy implements PermissionStrategy {
  canUploadDocument(actor: Actor, targetEmployee: TargetEmployee): AccessDecision {
    if (actor.id === targetEmployee.id || actor.keycloak_id === targetEmployee.keycloak_id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Users can only upload documents to their own profile.",
    };
  }
}

class ManagerUploadStrategy implements PermissionStrategy {
  canUploadDocument(actor: Actor, targetEmployee: TargetEmployee): AccessDecision {
    const isManagerRole = actor.roles.some((r) => r.toLowerCase() === "manager");
    if (isManagerRole && targetEmployee.reporting_manager_id === actor.id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Managers can only upload documents for direct reports.",
    };
  }
}

class AdminHRUploadStrategy implements PermissionStrategy {
  private allowedRoles = ["hr", "hradmin", "hr_admin", "system_admin", "admin"];

  canUploadDocument(actor: Actor, _targetEmployee: TargetEmployee): AccessDecision {
    const hasHRRole = actor.roles.some((r) => this.allowedRoles.includes(r.toLowerCase()));
    if (hasHRRole) {
      return { allowed: true };
    }
    return { allowed: false, reason: "Insufficient elevated permissions." };
  }
}

export class DocumentUploadPolicy {
  private strategies: PermissionStrategy[] = [
    new SelfServiceUploadStrategy(),
    new ManagerUploadStrategy(),
    new AdminHRUploadStrategy(),
  ];

  authorize(actor: Actor, targetEmployee: TargetEmployee): AccessDecision {
    for (const strategy of this.strategies) {
      const decision = strategy.canUploadDocument(actor, targetEmployee);
      if (decision.allowed) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: "Forbidden: You do not have permission to upload documents for this employee.",
    };
  }
}

// 3. POST Route Handler
export async function POST(request: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // A. Authenticate User
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.sub) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    // B. Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const employeeId = formData.get("employee_id") as string | null;

    if (!file || !category || !employeeId) {
      return apiError(
        "VALIDATION_ERROR",
        "Missing required form fields: file, category, or employee_id",
        400
      );
    }

    // C. Fetch Actor's Employee ID from DB using keycloak_id (authUser.sub)
    const actorRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1;`,
      [authUser.sub]
    );

    const actorDbId = actorRes.rows[0]?.id || "";

    const actor: Actor = {
      id: actorDbId,
      keycloak_id: authUser.sub,
      roles: authUser.roles || [],
    };

    // D. Fetch Target Employee from DB
    const targetRes = await client.query(
      `SELECT id, keycloak_id, reporting_manager_id FROM employees WHERE id = $1 LIMIT 1;`,
      [employeeId]
    );

    const targetEmployee: TargetEmployee | undefined = targetRes.rows[0];

    if (!targetEmployee) {
      return apiError("NOT_FOUND", "Target employee record not found", 404);
    }

    // E. Run Access Policy Check
    const policy = new DocumentUploadPolicy();
    const decision = policy.authorize(actor, targetEmployee);

    if (!decision.allowed) {
      return apiError("FORBIDDEN", decision.reason || "Access denied", 403);
    }

    // F. Save File to Local Disk Storage (`public/uploads/<employee_id>/`)
    const uploadDir = path.join(process.cwd(), "public", "uploads", employeeId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate safe unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedFileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = path.join(uploadDir, storedFileName);

    // Convert file to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    // Next.js serves files in /public from the root URL
    const fileUrl = `/uploads/${employeeId}/${storedFileName}`;

    // G. Persist Document Metadata into Database
    const insertQuery = `
      INSERT INTO employee_documents (
        employee_id,
        category,
        file_name,
        file_size_bytes,
        file_type,
        file_url,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      employeeId,
      category,
      file.name,
      file.size,
      file.type || "application/octet-stream",
      fileUrl,
      "pending",
    ];

    const result = await client.query(insertQuery, values);
    const newDocument = result.rows[0];

    return ok(
      newDocument,
      { success: true, message: "Document uploaded successfully to local storage" },
      201
    );
  } catch (error: any) {
    console.error("Error saving document to local storage:", error);
    return apiError("INTERNAL_ERROR", "Failed to process document upload", 500);
  } finally {
    client.release();
  }
}