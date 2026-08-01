-- AttendEasy database schema
-- Run with: npm run db:setup

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS test_marks CASCADE;
DROP TABLE IF EXISTS conflicts CASCADE;
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS semesters CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS college_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('hod', 'faculty', 'student')),
  faculty_id TEXT,
  student_id TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  roll_number VARCHAR(100) UNIQUE NOT NULL,
  year INTEGER NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  semester INTEGER,
  division VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE college_config (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  college_name VARCHAR(255) NOT NULL,
  working_days TEXT[] NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  lecture_duration INTEGER NOT NULL,
  lunch_break_start VARCHAR(10) NOT NULL,
  lunch_break_end VARCHAR(10) NOT NULL,
  short_break_duration INTEGER NOT NULL,
  max_lectures_per_day INTEGER NOT NULL,
  max_lectures_per_faculty INTEGER NOT NULL,
  semester_count INTEGER NOT NULL,
  division_count INTEGER NOT NULL,
  is_configured BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE faculty (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(255) NOT NULL DEFAULT 'General',
  designation VARCHAR(255) NOT NULL DEFAULT 'Faculty',
  subject_ids TEXT[] DEFAULT '{}',
  preferred_slots TEXT[] DEFAULT '{}',
  unavailable_slots TEXT[] DEFAULT '{}',
  weekly_load INTEGER NOT NULL DEFAULT 0,
  daily_load INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  avatar TEXT,
  phone VARCHAR(50)
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  semester INTEGER NOT NULL,
  division VARCHAR(50) NOT NULL DEFAULT 'A',
  faculty_id TEXT REFERENCES faculty(id) ON DELETE SET NULL,
  lecture_count_per_week INTEGER NOT NULL DEFAULT 3,
  lab_required BOOLEAN NOT NULL DEFAULT false,
  theory_hours INTEGER NOT NULL DEFAULT 3,
  lab_hours INTEGER NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 3,
  type VARCHAR(50) NOT NULL DEFAULT 'theory',
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classrooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_number VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL,
  room_type VARCHAR(50) NOT NULL,
  equipment TEXT[] DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  floor INTEGER,
  block VARCHAR(100)
);

CREATE TABLE semesters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE divisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  semester_id TEXT REFERENCES semesters(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  subject_ids TEXT[] DEFAULT '{}'
);

CREATE TABLE time_slots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  day VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  slot_type VARCHAR(50) NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE timetable_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  time_slot_id TEXT REFERENCES time_slots(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id TEXT REFERENCES faculty(id) ON DELETE CASCADE,
  classroom_id TEXT REFERENCES classrooms(id) ON DELETE CASCADE,
  semester_id TEXT REFERENCES semesters(id) ON DELETE CASCADE,
  division_id TEXT REFERENCES divisions(id) ON DELETE CASCADE,
  day VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  week INTEGER,
  is_published BOOLEAN DEFAULT false,
  is_modified BOOLEAN DEFAULT false,
  replacement_faculty_id TEXT REFERENCES faculty(id) ON DELETE SET NULL
);

CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  allowed_radius INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

CREATE TABLE test_marks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  max_marks NUMERIC NOT NULL,
  obtained_marks NUMERIC NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_year ON students(year);
CREATE INDEX idx_subjects_year_semester ON subjects(year, semester);
CREATE INDEX idx_attendance_sessions_subject ON attendance_sessions(subject_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX idx_test_marks_student_subject ON test_marks(student_id, subject_id);
