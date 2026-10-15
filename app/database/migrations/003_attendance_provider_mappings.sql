-- Provider Pay Codes are external identifiers. They deliberately live outside
-- employees.employee_code so HRMS employee codes are never rewritten to suit a
-- particular attendance vendor.
CREATE TABLE IF NOT EXISTS attendance_provider_employee_mappings (
  provider_code VARCHAR(50) PRIMARY KEY,
  employee_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_provider_mapping_employee
  ON attendance_provider_employee_mappings (employee_id);
