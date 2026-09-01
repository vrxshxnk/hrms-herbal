create extension if not exists "uuid-ossp";

create table if not exists legal_entities (
    id uuid primary key default gen_random_uuid(),
    code varchar(50) unique not null,
    name varchar(150) not null,
    created_at timestamp with time zone default current_timestamp
);

create table if not exists business_units (
    id uuid primary key default gen_random_uuid(),
    legal_entity_id uuid not null references legal_entities(id) on delete cascade,
    code varchar(50) unique not null,
    name varchar(150) not null,
    created_at timestamp with time zone default current_timestamp
);

create table if not exists departments (
    id uuid primary key default gen_random_uuid(),
    business_unit_id uuid not null references business_units(id) on delete cascade,
    parent_department_id uuid references departments(id) on delete set null, -- sub-department hierarchy
    code varchar(50) unique not null,
    name varchar(150) not null,
    created_at timestamp with time zone default current_timestamp
);

create table if not exists designations (
    id uuid primary key default gen_random_uuid(),
    code varchar(50) unique not null,
    title varchar(100) not null,
    grade_level varchar(50) not null, 
    created_at timestamp with time zone default current_timestamp
);

create table if not exists locations (
    id uuid primary key default gen_random_uuid(),
    code varchar(50) unique not null,
    name varchar(100) not null,
    work_mode varchar(20) not null default 'office', 
    city varchar(100) not null,
    state varchar(100) not null,
    country varchar(100) not null,
    postal_code varchar(20) not null,
    created_at timestamp with time zone default current_timestamp
);

create table if not exists shifts (
    id uuid primary key default gen_random_uuid(),
    name varchar(50) not null,
    start_time time not null,
    end_time time not null,
    created_at timestamp with time zone default current_timestamp
);

create table if not exists employees (
    id uuid primary key default gen_random_uuid(),
    employee_code varchar(50) unique not null,
    
    first_name varchar(100) not null,
    middle_name varchar(100),
    last_name varchar(100) not null,
    display_name varchar(200),
    profile_photo_url text,
    gender varchar(20) not null, 
    date_of_birth date not null,
    blood_group varchar(10),
    marital_status varchar(20) not null,
    nationality varchar(50),
    preferred_language varchar(50) default 'english',

    -- contact info
    work_email varchar(255) unique not null,
    personal_email varchar(255),
    mobile_number varchar(20) not null,
    alternate_mobile varchar(20),

    -- address details
    current_address text,
    permanent_address text,
    city varchar(100),
    state varchar(100),
    country varchar(100),
    postal_code varchar(20),

    -- organizational mappings
    legal_entity_id uuid references legal_entities(id),
    business_unit_id uuid references business_units(id),
    department_id uuid references departments(id),
    designation_id uuid references designations(id),
    location_id uuid references locations(id),
    shift_id uuid references shifts(id),
    cost_center varchar(50),
    employee_category varchar(50) not null default 'staff', -- staff, management, worker

    -- multi-level reporting structure
    reporting_manager_id uuid references employees(id) on delete set null,
    super_manager_id uuid references employees(id) on delete set null,

    -- employment status & lifecycle
    employment_type varchar(50) not null default 'permanent', -- permanent, contract, temporary, consultant
    status varchar(50) not null default 'active', -- active, inactive, on_notice, resigned, terminated, retired, on_hold
    joining_date date not null,
    confirmation_date date,
    exit_date date,

    -- iam / system roles
    system_role varchar(50) not null default 'employee', -- employee, manager, super_manager, hr, hr_admin, system_admin

    -- system timestamps
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp,

    -- business rules constraints
    constraint chk_no_self_manager check (reporting_manager_id != id),
    constraint chk_no_self_super_manager check (super_manager_id != id)
);

create table if not exists employee_identities (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid unique not null references employees(id) on delete cascade,
    aadhaar_number varchar(20),
    pan_number varchar(20),
    passport_number varchar(50),
    passport_expiry_date date,
    driving_licence varchar(50),
    voter_id varchar(50),
    other_government_id varchar(100),
    work_permit_visa_details text,
    created_at timestamp with time zone default current_timestamp
);

create table if not exists employee_emergency_contacts (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references employees(id) on delete cascade,
    contact_name varchar(100) not null,
    relationship varchar(50) not null,
    mobile_number varchar(20) not null,
    email varchar(255),
    is_primary boolean default true
);

create table if not exists attendance_records (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references employees(id) on delete cascade,
    attendance_date date not null,
    status varchar(20) not null, -- present, absent, half_day, on_leave
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    working_hours decimal(4,2) default 0.00,
    location_id uuid references locations(id),
    shift_id uuid references shifts(id),
    source varchar(50) default 'biometric', -- biometric, web, mobile
    created_at timestamp with time zone default current_timestamp,
    constraint idx_emp_date unique(employee_id, attendance_date)
);

create table if not exists employee_audit_logs (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references employees(id) on delete cascade,
    field_changed varchar(100) not null,
    previous_value text,
    new_value text,
    changed_by uuid references employees(id),
    change_source varchar(50) default 'web_hrms',
    created_at timestamp with time zone default current_timestamp
);


create table if not exists leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year DECIMAL(4, 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp
);


create table if not exists leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL, 
    total_days DECIMAL(4, 1) NOT NULL, 
    half_day_type VARCHAR(20) DEFAULT 'full_day', 
    reason TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    action_taken_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp,
    CONSTRAINT chk_date_range CHECK (end_date >= start_date)
);


CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);