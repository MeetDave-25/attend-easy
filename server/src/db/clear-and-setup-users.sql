-- Clear all existing data
TRUNCATE TABLE attendance_records CASCADE;
TRUNCATE TABLE attendance_sessions CASCADE;
TRUNCATE TABLE test_marks CASCADE;
TRUNCATE TABLE timetable_entries CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE subjects CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert only the two required users
-- Password for both is 'password123' (hashed with bcrypt)
INSERT INTO users (email, password_hash, role) VALUES
('teacher@attend.com', '$2a$10$YQZ9X8qH5fK5L5J5L5J5L.YQZ9X8qH5fK5L5J5L5J5L5J5L5J5L5J5', 'teacher'),
('stu@gmail.com', '$2a$10$YQZ9X8qH5fK5L5J5L5J5L.YQZ9X8qH5fK5L5J5L5J5L5J5L5J5L5J5', 'student');

-- Note: The password hashes above are placeholders. 
-- They will be updated by the setup script with proper bcrypt hashes.
