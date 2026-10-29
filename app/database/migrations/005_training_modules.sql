-- Training tables were added to 001, which never reruns on an existing database.
-- Every statement is IF NOT EXISTS, so this is safe where they already exist.
-- 1. Training catalogue: one row per training video
create table if not exists training_modules (
    id uuid primary key default gen_random_uuid(),
    code varchar(50) unique not null,
    title varchar(255) not null,
    description text,
    category varchar(100) not null default 'general', -- e.g. 'compliance', 'safety', 'onboarding', 'technical', 'soft_skills'

    -- video (played inside an iframe on the frontend)
    video_url text not null,
    video_provider varchar(30) not null default 'youtube'
        check (video_provider in ('youtube', 'vimeo', 'gdrive', 'self_hosted', 'other')),
    thumbnail_url text,
    duration_seconds int not null check (duration_seconds > 0),

    -- completion rules
    completion_threshold smallint not null default 100
        check (completion_threshold between 1 and 100),   -- % of video that must be watched
    requires_acknowledgement boolean not null default true, -- show the final "Continue / I have completed" button

    is_mandatory boolean not null default false,
    is_active boolean not null default true,
    created_by uuid references employees(id) on delete set null,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp
);

-- 2. Schedule: a training assigned to a department for a time window
create table if not exists training_schedules (
    id uuid primary key default gen_random_uuid(),
    training_module_id uuid not null references training_modules(id) on delete cascade,
    department_id uuid not null references departments(id) on delete cascade,
    scheduled_by uuid references employees(id) on delete set null,
    start_date date not null,
    due_date date,
    status varchar(20) not null default 'scheduled'
        check (status in ('scheduled', 'active', 'completed', 'cancelled')),
    notes text,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp,
    constraint chk_training_dates check (due_date is null or due_date >= start_date),
    constraint uq_training_module_dept_start unique (training_module_id, department_id, start_date)
);

-- 3. Per-employee progress: one row per employee per schedule
create table if not exists employee_training_progress (
    id uuid primary key default gen_random_uuid(),
    training_schedule_id uuid not null references training_schedules(id) on delete cascade,
    employee_id uuid not null references employees(id) on delete cascade,
    status varchar(20) not null default 'not_started'
        check (status in ('not_started', 'in_progress', 'completed')),

    -- video tracking (lets the employee resume and lets the server verify completion)
    watch_percent numeric(5, 2) not null default 0.00 check (watch_percent between 0 and 100),
    max_watched_seconds int not null default 0 check (max_watched_seconds >= 0),
    last_position_seconds int not null default 0 check (last_position_seconds >= 0),

    started_at timestamp with time zone,
    video_completed_at timestamp with time zone,  -- set when watch_percent >= completion_threshold
    acknowledged_at timestamp with time zone,     -- set when the employee clicks the final button
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp,
    constraint uq_training_schedule_employee unique (training_schedule_id, employee_id)
);

create index if not exists idx_training_modules_category on training_modules(category);
create index if not exists idx_training_modules_active on training_modules(is_active);
create index if not exists idx_training_schedules_dept on training_schedules(department_id);
create index if not exists idx_training_schedules_module on training_schedules(training_module_id);
create index if not exists idx_training_schedules_status_dates on training_schedules(status, start_date, due_date);
create index if not exists idx_training_progress_employee on employee_training_progress(employee_id);
create index if not exists idx_training_progress_schedule on employee_training_progress(training_schedule_id);
create index if not exists idx_training_progress_status on employee_training_progress(status);
