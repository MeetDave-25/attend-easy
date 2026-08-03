// ============================================================
// All Types for Smart College Timetable Management System
// ============================================================

// --- Auth ---
export type UserRole = 'hod' | 'faculty' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facultyId?: string;
  studentId?: string;
  avatar?: string;
}

// --- College Config ---
export interface CollegeConfig {
  id?: string;
  collegeName: string;
  workingDays: string[];
  startTime: string;      // "09:00"
  endTime: string;        // "17:00"
  lectureDuration: number; // minutes
  lunchBreakStart: string;
  lunchBreakEnd: string;
  shortBreakDuration: number; // minutes
  maxLecturesPerDay: number;
  maxLecturesPerFaculty: number;
  semesterCount: number;
  divisionCount: number;
  isConfigured: boolean;
}

// --- Faculty ---
export interface Faculty {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  subjectIds: string[];
  preferredSlots: string[];
  unavailableSlots: string[];
  weeklyLoad: number;
  dailyLoad: number;
  status: 'active' | 'inactive' | 'on-leave';
  avatar?: string;
  phone?: string;
}

// --- Subject ---
export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  division: string;
  facultyId?: string;
  lectureCountPerWeek: number;
  labRequired: boolean;
  theoryHours: number;
  labHours: number;
  credits: number;
  type: 'theory' | 'lab' | 'seminar';
  year?: number;
}

// --- Classroom ---
export interface Classroom {
  id: string;
  roomNumber: string;
  capacity: number;
  roomType: 'classroom' | 'lab' | 'seminar_hall';
  equipment: string[];
  status: 'available' | 'maintenance' | 'occupied';
  floor?: number;
  block?: string;
}

// --- Semester & Division ---
export interface Division {
  id: string;
  semesterId: string;
  name: string; // A, B, C
  studentCount: number;
  subjectIds: string[];
}

export interface Semester {
  id: string;
  number: number;
  divisions: Division[];
  year: number;
  isActive: boolean;
}

// --- Time Slots ---
export type SlotType = 'lecture' | 'lab' | 'break' | 'lunch';

export interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotType: SlotType;
  order: number;
}

// --- Timetable ---
export interface TimetableEntry {
  id: string;
  timeSlotId: string;
  subjectId: string;
  facultyId: string;
  classroomId: string;
  semesterId: string;
  divisionId: string;
  day: string;
  startTime: string;
  endTime: string;
  week?: number;
  isPublished?: boolean;
  isModified?: boolean;
  replacementFacultyId?: string;
}

export interface TimetableCell {
  slot: TimeSlot;
  entry?: TimetableEntry;
  subject?: Subject;
  faculty?: Faculty;
  classroom?: Classroom;
  semester?: Semester;
  division?: Division;
  hasConflict?: boolean;
  conflictType?: ConflictType;
}

// --- Conflicts ---
export type ConflictType =
  | 'faculty_conflict'
  | 'room_conflict'
  | 'semester_conflict'
  | 'division_conflict'
  | 'lab_conflict'
  | 'workload_conflict'
  | 'validation_error'
  | 'unavailable_faculty'
  | 'holiday_conflict';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: 'error' | 'warning';
  description: string;
  affectedEntries: string[];
  suggestions: string[];
  day?: string;
  timeSlot?: string;
  facultyId?: string;
  roomId?: string;
}

// --- Requests ---
export type RequestType = 'leave' | 'swap' | 'time_change' | 'replacement';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Request {
  id: string;
  facultyId: string;
  type: RequestType;
  status: RequestStatus;
  reason: string;
  date: string;           // target date
  fromSlot?: string;
  toSlot?: string;
  replacementFacultyId?: string;
  timetableEntryId?: string;
  createdAt: string;
  resolvedAt?: string;
  hodNote?: string;
}

export interface LeaveEntry {
  id: string;
  facultyId: string;
  date: string;
  reason: string;
  status: RequestStatus;
}

// --- Notifications ---
export type NotificationType =
  | 'timetable_published'
  | 'lecture_changed'
  | 'replacement_assigned'
  | 'leave_approved'
  | 'request_rejected'
  | 'conflict_detected'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  forRole: UserRole | 'all';
  forUserId?: string;
  isRead: boolean;
  createdAt: string;
  // A future time means the announcement stays hidden until that time.
  scheduledFor?: string;
}

// --- Reports ---
export interface FacultyWorkloadReport {
  facultyId: string;
  facultyName: string;
  department: string;
  totalLectures: number;
  weeklyLoad: number;
  maxLoad: number;
  percentage: number;
  subjects: string[];
}

export interface RoomUtilizationReport {
  roomId: string;
  roomNumber: string;
  roomType: string;
  totalSlots: number;
  usedSlots: number;
  percentage: number;
  freeSlots: { day: string; time: string }[];
}

export interface SubjectCoverageReport {
  subjectId: string;
  subjectName: string;
  code: string;
  requiredLectures: number;
  scheduledLectures: number;
  isComplete: boolean;
}

// --- Generator ---
export interface GenerationConfig {
  strategy: 'balanced' | 'compact' | 'spread';
  avoidConsecutiveSameSubject: boolean;
  respectPreferences: boolean;
  minimizeGaps: boolean;
}

export interface GenerationResult {
  success: boolean;
  entries: TimetableEntry[];
  conflicts: Conflict[];
  stats: {
    totalEntries: number;
    facultyAssigned: number;
    roomsUsed: number;
    conflictsFound: number;
    generatedAt: string;
  };
}

// --- Legacy support for existing types ---
export interface AttendanceSession {
  id: string;
  subjectId: string;
  subjectName?: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  qrCode: string;
  expiresAt: Date;
  isActive: boolean;
  presentStudents: string[];
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  year: number;
  email: string;
  semester?: number;
  division?: string;
}

export interface TestMark {
  id: string;
  studentId: string;
  subjectId: string;
  testName: string;
  maxMarks: number;
  obtainedMarks: number;
  date: Date;
}
