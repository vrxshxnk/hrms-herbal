-- Provider Performance Register fields. IN1 maps to check_in_time and Out2 maps to check_out_time.
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shift_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_attendance_provider_status
  ON attendance_records (provider_status);
