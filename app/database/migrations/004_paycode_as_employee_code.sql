-- The provider Pay Code is the HRMS employee code, so the separate mapping table
-- from 003 is retired. Saved mappings are copied onto employees.employee_code
-- first so attendance imports keep matching the same people.
DO $$
DECLARE
  conflicting TEXT;
BEGIN
  IF to_regclass('public.attendance_provider_employee_mappings') IS NULL THEN
    RETURN;
  END IF;

  -- A Pay Code already used as another employee's code cannot be adopted safely.
  SELECT string_agg(m.provider_code, ', ') INTO conflicting
  FROM attendance_provider_employee_mappings m
  JOIN employees other ON other.employee_code = m.provider_code AND other.id <> m.employee_id
  WHERE NOT EXISTS (
    SELECT 1 FROM attendance_provider_employee_mappings om WHERE om.employee_id = other.id
  );
  IF conflicting IS NOT NULL THEN
    RAISE EXCEPTION 'Pay Codes already used by other employees: %', conflicting;
  END IF;

  -- Two passes so codes that swap between mapped employees never collide mid-update.
  UPDATE employees e
  SET employee_code = '__paycode_' || e.id::text
  FROM attendance_provider_employee_mappings m
  WHERE m.employee_id = e.id AND e.employee_code <> m.provider_code;

  UPDATE employees e
  SET employee_code = m.provider_code, updated_at = CURRENT_TIMESTAMP
  FROM attendance_provider_employee_mappings m
  WHERE m.employee_id = e.id AND e.employee_code = '__paycode_' || e.id::text;

  DROP TABLE attendance_provider_employee_mappings;
END $$;
