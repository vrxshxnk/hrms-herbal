import { z } from "zod";

// Helper preprocessors
const emptyStringToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const optionalText = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional(),
);

const optionalUuid = z.preprocess(
  emptyStringToUndefined,
  z.string().uuid("Invalid UUID format").optional().nullable(),
);

const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z.string().date("Invalid date format (YYYY-MM-DD)").optional().nullable(),
);

// -----------------------------------------------------------------------------
// 1. ORGANIZATIONAL LOOKUP SCHEMAS
// -----------------------------------------------------------------------------

export const createLegalEntitySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Legal Entity code is required")
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1, "Legal Entity name is required"),
});

export const createBusinessUnitSchema = z.object({
  legal_entity_id: z.string().uuid("Invalid Legal Entity ID"),
  code: z
    .string()
    .trim()
    .min(1, "Business Unit code is required")
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1, "Business Unit name is required"),
});

export const createDepartmentSchema = z.object({
  business_unit_id: z.string().uuid("Invalid Business Unit ID"),
  parent_department_id: optionalUuid,
  code: z
    .string()
    .trim()
    .min(1, "Department code is required")
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1, "Department name is required"),
});

export const createDesignationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Designation code is required")
    .transform((v) => v.toLowerCase()),
  title: z.string().trim().min(1, "Designation title is required"),
  grade_level: z.string().trim().min(1, "Grade level is required"),
});

export const createLocationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Location code is required")
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1, "Location name is required"),
  work_mode: z.enum(["office", "remote", "hybrid"]).default("office"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  country: z.string().trim().min(1, "Country is required"),
  postal_code: z.string().trim().min(1, "Postal code is required"),
});

export const createShiftSchema = z.object({
  name: z.string().trim().min(1, "Shift name is required"),
  start_time: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/,
      "Invalid start time format (HH:MM or HH:MM:SS)",
    ),
  end_time: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/,
      "Invalid end time format (HH:MM or HH:MM:SS)",
    ),
});

// -----------------------------------------------------------------------------
// 2. EMPLOYEE CHILD TABLE SCHEMAS
// -----------------------------------------------------------------------------

export const emergencyContactInputSchema = z.object({
  contact_name: z.string().trim().min(2, "Name required"),
  relationship: z.string().trim().min(2, "Relationship required"),
  mobile_number: z.string().trim().min(8, "Valid mobile required"),
  email: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email().optional(),
  ),
  is_primary: z.boolean().default(true),
});

export const identityInputSchema = z.object({
  aadhaar_number: optionalText,
  pan_number: optionalText,
  passport_number: optionalText,
  passport_expiry_date: optionalDate,
  driving_licence: optionalText,
  voter_id: optionalText,
  other_government_id: optionalText,
  work_permit_visa_details: optionalText,
});

// -----------------------------------------------------------------------------
// 3. MASTER EMPLOYEE SCHEMA
// -----------------------------------------------------------------------------

export const createEmployeeSchema = z.object({
  // Identification & Personal
  employee_code: z.string().trim().min(1, "Employee code is required"),
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: optionalText,
  last_name: z.string().trim().min(1, "Last name is required"),
  display_name: optionalText,
  profile_photo_url: z.preprocess(
    emptyStringToUndefined,
    z.string().url("Invalid photo URL").optional(),
  ),
  gender: z.enum(["male", "female", "other"]),
  date_of_birth: z.string().date("Valid birth date required (YYYY-MM-DD)"),
  blood_group: optionalText,
  marital_status: z.enum(["single", "married", "divorced", "widowed"]),
  nationality: optionalText,
  preferred_language: z.string().default("english"),

  // Contact & Address
  work_email: z.string().trim().email("Invalid work email"),
  personal_email: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email("Invalid personal email").optional(),
  ),
  mobile_number: z.string().trim().min(8, "Valid mobile number required"),
  alternate_mobile: optionalText,
  current_address: optionalText,
  permanent_address: optionalText,
  city: optionalText,
  state: optionalText,
  country: optionalText,
  postal_code: optionalText,

  // Organization Foreign Keys
  // legal_entity_id: z.string().uuid("Invalid Legal Entity ID"),
  // business_unit_id: z.string().uuid("Invalid Business Unit ID"),
  // department_id: z.string().uuid("Invalid Department ID"),
  // designation_id: z.string().uuid("Invalid Designation ID"),
  // location_id: z.string().uuid("Invalid Location ID"),
  // shift_id: optionalUuid,
  // cost_center: optionalText,
  // employee_category: z.enum(["staff", "management", "worker"]).default("staff"),
  legal_entity_id: optionalUuid,
  business_unit_id: optionalUuid,
  department_id: optionalUuid,
  designation_id: optionalUuid,
  location_id: optionalUuid,
  shift_id: optionalUuid,
  cost_center: optionalText,
  employee_category: z.enum(["staff", "management", "worker"]).default("staff"),

  // Reporting Structure
  reporting_manager_id: optionalUuid,
  super_manager_id: optionalUuid,

  // Status & Dates
  employment_type: z
    .enum(["permanent", "contract", "temporary", "consultant"])
    .default("permanent"),
  status: z
    .enum([
      "active",
      "inactive",
      "on_notice",
      "resigned",
      "terminated",
      "retired",
      "on_hold",
    ])
    .default("active"),
  joining_date: z.string().date("Invalid joining date (YYYY-MM-DD)"),
  confirmation_date: optionalDate,
  exit_date: optionalDate,

  // System Role
  system_role: z
    .enum([
      "employee",
      "manager",
      "super_manager",
      "hr",
      "hr_admin",
      "system_admin",
    ])
    .default("employee"),

  // Child Info
  identities: identityInputSchema.optional(),
  // emergency_contacts: z.array(emergencyContactInputSchema).optional().default([]),
});

// -----------------------------------------------------------------------------
// 4. ATTENDANCE RECORD SCHEMA
// -----------------------------------------------------------------------------
export const taskInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  assigned_to: z.string().uuid("Invalid assigned_to UUID"),
  assigned_by: z.string().uuid("Invalid assigned_by UUID"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.coerce.date().optional(),
});

export const createAttendanceRecordSchema = z.object({
  employee_id: z.string().uuid("Invalid Employee ID"),
  attendance_date: z.string().date("Invalid attendance date (YYYY-MM-DD)"),
  status: z.enum(["present", "absent", "half_day", "on_leave"]),
  check_in_time: z.preprocess(
    emptyStringToUndefined,
    z.string().datetime("Invalid ISO timestamp").optional().nullable(),
  ),
  check_out_time: z.preprocess(
    emptyStringToUndefined,
    z.string().datetime("Invalid ISO timestamp").optional().nullable(),
  ),
  working_hours: z
    .number()
    .min(0, "Working hours cannot be negative")
    .max(24, "Max 24 hours per day")
    .default(0.0),
  location_id: optionalUuid,
  shift_id: optionalUuid,
  source: z.enum(["biometric", "web", "mobile"]).default("biometric"),
  is_regularized: z.boolean().optional().default(false),
  regularized_by: optionalUuid,
  regularization_reason: z.string().optional().nullable(),
});

export const faqQueryInputSchema = z.object({
  name: z.string().max(100, "Name must be under 100 characters").optional(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be under 255 characters"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(255, "Subject must be under 255 characters"),
  question: z
    .string()
    .min(1, "Question is required")
    .min(10, "Question should be at least 10 characters long"),
});

export const createAnnouncementSchema = z.object({
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title cannot be empty")
    .max(255, "Title cannot exceed 255 characters"),
  
  content: z
    .string({ message: "Content is required" })
    .min(1, "Content cannot be empty"),

  priority: z
    .enum(["low", "medium", "high", "critical"])
    .default("medium"),

  // Optional audience scope targeting (NULL / undefined implies global)
  target_legal_entity_id: z.string().uuid("Invalid Legal Entity ID").nullable().optional(),
  target_department_id: z.string().uuid("Invalid Department ID").nullable().optional(),
  target_location_id: z.string().uuid("Invalid Location ID").nullable().optional(),

  expires_at: z
    .string()
    .datetime({ message: "expires_at must be a valid ISO timestamp string" })
    .nullable()
    .optional(),

  is_published: z.boolean().default(true),
});



export const createEmployeeDocumentSchema = z.object({
  employee_id: z.string().uuid("Invalid Employee ID"),
  category: z.enum(
    ["aadhar", "pan", "education", "experience", "relieving", "bank", "other"],
    { message: "Invalid document category" }
  ),
  file_name: z
    .string()
    .trim()
    .min(1, "File name is required"),
  file_size_bytes: z
    .number({ message: "File size must be a number" })
    .positive("File size must be greater than 0"),
  file_type: optionalText,
  file_url: z
    .string()
    .trim()
    .url("Invalid document URL"),
  status: z
    .enum(["pending", "verified", "rejected"])
    .default("pending"),
  rejection_reason: optionalText,
  verified_by: optionalUuid,
  verified_at: optionalText,
});


export const advanceSalarySchema = z.object({
  requestType: z.enum(["advance", "loan"], {
    message: "Request type must be either 'advance_salary' or 'loan'",
  }),
  amountRequested: z
    .number({ message: "Amount must be a number" })
    .positive("Requested amount must be greater than 0"),
  approvedAmount: z
    .number()
    .positive("Approved amount must be greater than 0")
    .optional()
    .nullable(),
  tenureMonths: z
    .number({ message: "Tenure months must be a number" })
    .int("Tenure months must be an integer")
    .min(1, "Tenure must be at least 1 month")
    .max(24, "Maximum allowed tenure is 24 months")
    .default(1),
  reason: z
    .string({ message: "Reason is required" })
    .trim()
    .min(5, "Please provide a reason of at least 5 characters")
    .max(500, "Reason cannot exceed 500 characters"),
  status: z
    .enum(["Pending", "In_Review", "Approved", "Rejected", "Disbursed"])
    .default("Pending"),
  managerApprovalStatus: z
    .enum(["Pending", "Approved", "Rejected"])
    .default("Pending"),
  managerApprovedBy: optionalUuid,
  hrApprovalStatus: z
    .enum(["Pending", "Approved", "Rejected"])
    .default("Pending"),
  hrApprovedBy: optionalUuid,
  financeStatus: z
    .enum(["Pending", "Approved", "Rejected"])
    .default("Pending"),
  financeApprovedBy: optionalUuid,
});

// -----------------------------------------------------------------------------
// 5. EMPLOYEE AUDIT LOG SCHEMA
// -----------------------------------------------------------------------------

export const createEmployeeAuditLogSchema = z.object({
  employee_id: z.string().uuid("Invalid Employee ID"),
  field_changed: z
    .string()
    .trim()
    .min(1, "Field changed description is required"),
  previous_value: optionalText,
  new_value: optionalText,
  changed_by: optionalUuid,
  change_source: z.string().trim().default("web_hrms"),
});

export const createLeaveRequestSchema = z.object({
  employee_id: z.string().uuid("Invalid Employee ID"),
  leave_code: z.enum(["CASUAL", "SICK", "MATERNITY", "PATERNITY"], {
    message: "Invalid leave type code",
  }),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  total_days: z.number({
    message: "Total days must be a number",
  }),
  half_day_type: z
    .enum(["full_day", "first_half", "second_half"])
    .default("full_day"),
  status: z.enum(["Pending", "Approved", "Rejected"]).default("Pending"),
  reason: optionalText,
});


export type CreateLegalEntityInput = z.infer<typeof createLegalEntitySchema>;
export type CreateBusinessUnitInput = z.infer<typeof createBusinessUnitSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type CreateAttendanceRecordInput = z.infer<
  typeof createAttendanceRecordSchema
>;
export type CreateEmployeeAuditLogInput = z.infer<
  typeof createEmployeeAuditLogSchema
>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;