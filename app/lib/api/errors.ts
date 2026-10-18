import type { ApiErrorCode } from "./response";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function isWorkflowError(error: unknown): error is { code: ApiErrorCode; message: string; status: number } {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, unknown>;
  return ["BAD_REQUEST", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "VALIDATION_ERROR", "WORKFLOW_ERROR"].includes(String(value.code))
    && typeof value.message === "string" && typeof value.status === "number";
}
