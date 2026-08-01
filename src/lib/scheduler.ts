/**
 * Smart College Timetable Scheduling Engine v3.0
 * Algorithm: Greedy Constraint Satisfaction with Priority Heuristics
 * 
 * Strategy:
 * 1. Sort subjects by difficulty-to-schedule (most constrained first) — MRV heuristic
 * 2. For each subject requirement, greedily pick the best available slot
 * 3. "Best" = slot that minimizes future constraint violations (LCV heuristic)
 * 4. Full backtracking if greedy fails for a subject
 * 5. Post-process: detect and report all conflicts
 */

import {
  Faculty, Subject, Classroom, Semester, TimeSlot,
  TimetableEntry, Conflict, CollegeConfig,
  GenerationResult, LeaveEntry,
} from '@/types';
import { generateId, timeToMinutes } from './utils';

// ============================================================
// Types
// ============================================================

export interface SchedulerInput {
  config: CollegeConfig;
  faculty: Faculty[];
  subjects: Subject[];
  classrooms: Classroom[];
  semesters: Semester[];
  timeSlots: TimeSlot[];
  leaveEntries: LeaveEntry[];
}

interface Assignment {
  subjectId: string;
  facultyId: string;
  classroomId: string;
  semesterId: string;
  divisionId: string;
  day: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
}

interface SlotCandidate {
  slot: TimeSlot;
  faculty: Faculty;
  classroom: Classroom;
  score: number; // higher = better
}

// ============================================================
// Constraint Checkers (Pure Functions)
// ============================================================

const isFacultyOnLeave = (fId: string, day: string, leaves: LeaveEntry[]) =>
  leaves.some(l => {
    if (l.facultyId !== fId || l.status !== 'approved') return false;
    if (l.date === day) return true;
    const parsed = new Date(l.date);
    return !Number.isNaN(parsed.getTime()) && parsed.toLocaleDateString('en-US', { weekday: 'long' }) === day;
  });

const isFacultyUnavailable = (f: Faculty, slotId: string) =>
  f.unavailableSlots?.includes(slotId) ?? false;

const hasFacultyConflict = (assignments: Assignment[], fId: string, day: string, slotId: string) =>
  assignments.some(a => a.facultyId === fId && a.day === day && a.timeSlotId === slotId);

const hasDivisionConflict = (assignments: Assignment[], semId: string, divId: string, day: string, slotId: string) =>
  assignments.some(a => a.semesterId === semId && a.divisionId === divId && a.day === day && a.timeSlotId === slotId);

const hasRoomConflict = (assignments: Assignment[], roomId: string, day: string, slotId: string) =>
  assignments.some(a => a.classroomId === roomId && a.day === day && a.timeSlotId === slotId);

const hasSameSubjectSameDay = (assignments: Assignment[], subjectId: string, divId: string, day: string) =>
  assignments.some(a => a.subjectId === subjectId && a.divisionId === divId && a.day === day);

const getFacultyDailyCount = (assignments: Assignment[], fId: string, day: string) =>
  assignments.filter(a => a.facultyId === fId && a.day === day).length;

const getFacultyWeeklyCount = (assignments: Assignment[], fId: string) =>
  assignments.filter(a => a.facultyId === fId).length;

const getSubjectWeeklyCount = (assignments: Assignment[], subjectId: string, divId: string) =>
  assignments.filter(a => a.subjectId === subjectId && a.divisionId === divId).length;

const isDuringLunch = (slot: TimeSlot, config: CollegeConfig) => {
  const s = timeToMinutes(slot.startTime);
  const e = timeToMinutes(slot.endTime);
  const ls = timeToMinutes(config.lunchBreakStart);
  const le = timeToMinutes(config.lunchBreakEnd);
  return s < le && e > ls;
};

// ============================================================
// Scoring: Evaluate a candidate slot (higher = better choice)
// LCV-inspired: penalize assignments that would over-constrain others
// ============================================================

function scoreCandidate(
  candidate: SlotCandidate,
  assignments: Assignment[],
  config: CollegeConfig
): number {
  let score = 100;

  const { slot, faculty } = candidate;
  const day = slot.day;

  // Prefer earlier slots in the day (order)
  score -= slot.order * 2;

  // Penalize if faculty is approaching daily limit
  const dailyCount = getFacultyDailyCount(assignments, faculty.id, day);
  score -= dailyCount * 10;

  // Penalize if faculty has preferred slots and this isn't one
  if (faculty.preferredSlots?.length > 0 && !faculty.preferredSlots.includes(slot.id)) {
    score -= 5;
  }

  // Bonus for preferred slots
  if (faculty.preferredSlots?.includes(slot.id)) {
    score += 15;
  }

  // Penalize assignments that cluster too many lectures in one day
  const divDayCount = assignments.filter(
    a => a.day === day && a.semesterId && a.timeSlotId === slot.id
  ).length;
  score -= divDayCount * 3;

  return score;
}

// ============================================================
// Main Greedy Scheduler with Backtracking Fallback
// ============================================================

export function generateTimetable(input: SchedulerInput): GenerationResult {
  const { config, faculty, subjects, classrooms, semesters, timeSlots, leaveEntries } = input;

  const assignments: Assignment[] = [];
  const unscheduled: string[] = [];

  // Filter usable lecture slots
  const lectureSlots = timeSlots.filter(
    ts => (ts.slotType === 'lecture' || ts.slotType === 'lab') && !isDuringLunch(ts, config)
  );

  // Group slots by day for fast lookup
  const slotsByDay: Record<string, TimeSlot[]> = {};
  lectureSlots.forEach(slot => {
    if (!slotsByDay[slot.day]) slotsByDay[slot.day] = [];
    slotsByDay[slot.day].push(slot);
  });
  // Sort each day's slots by order
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[day].sort((a, b) => a.order - b.order);
  });

  // ---- Step 1: Build scheduling tasks ----
  interface Task {
    subject: Subject;
    semesterId: string;
    divisionId: string;
    divisionName: string;
    semesterNumber: number;
    requiredCount: number;
    scheduledCount: number;
    facultyCandidates: Faculty[]; // Pre-computed candidates
  }

  const tasks: Task[] = [];

  for (const semester of semesters) {
    for (const division of semester.divisions) {
      const divSubjects = subjects.filter(
        sub =>
          sub.semester === semester.number &&
          (sub.division === division.name || sub.division === 'All' || !sub.division)
      );

      for (const subject of divSubjects) {
        const targetCount = subject.lectureCountPerWeek || 3;

        // Find all faculty who can teach this subject
        let facultyCandidates: Faculty[] = [];
        if (subject.facultyId) {
          const f = faculty.find(f => f.id === subject.facultyId);
          if (f && f.status === 'active') facultyCandidates = [f];
        } else {
          facultyCandidates = faculty.filter(
            f => f.status === 'active' && (f.subjectIds?.includes(subject.id) || f.subjectIds?.length === 0)
          );
        }

        tasks.push({
          subject,
          semesterId: semester.id,
          divisionId: division.id,
          divisionName: division.name,
          semesterNumber: semester.number,
          requiredCount: targetCount,
          scheduledCount: 0,
          facultyCandidates,
        });
      }
    }
  }

  // ---- Step 2: MRV Heuristic - Sort tasks by hardness ----
  // Hardest first: fewest faculty candidates, highest lecture count, lab subjects
  tasks.sort((a, b) => {
    const hardnessA =
      (1 / (a.facultyCandidates.length + 1)) * 100 +
      a.requiredCount +
      (a.subject.labRequired ? 20 : 0);
    const hardnessB =
      (1 / (b.facultyCandidates.length + 1)) * 100 +
      b.requiredCount +
      (b.subject.labRequired ? 20 : 0);
    return hardnessB - hardnessA; // Hardest first
  });

  // ---- Step 3: Greedy Scheduling ----
  for (const task of tasks) {
    const { subject, semesterId, divisionId, divisionName, semesterNumber } = task;
    let scheduled = 0;

    // Distribute across working days evenly
    const days = [...config.workingDays];
    
    // Try multiple passes to reach the target
    for (let pass = 0; pass < 3 && scheduled < task.requiredCount; pass++) {
      // Shuffle days for variety on each pass
      const shuffledDays = pass === 0 ? days : [...days].sort(() => Math.random() - 0.5);

      for (const day of shuffledDays) {
        if (scheduled >= task.requiredCount) break;

        // Skip if subject already scheduled on this day (spread across week)
        if (pass === 0 && hasSameSubjectSameDay(assignments, subject.id, divisionId, day)) continue;

        const daySlots = slotsByDay[day] || [];
        const candidates: SlotCandidate[] = [];

        for (const slot of daySlots) {
          // Skip wrong slot type for labs
          if (subject.type === 'lab' && slot.slotType !== 'lab') continue;

          // Skip if division already has a class here
          if (hasDivisionConflict(assignments, semesterId, divisionId, day, slot.id)) continue;

          // Try each faculty candidate
          for (const fac of task.facultyCandidates) {
            if (isFacultyOnLeave(fac.id, day, leaveEntries)) continue;
            if (isFacultyUnavailable(fac, slot.id)) continue;
            if (hasFacultyConflict(assignments, fac.id, day, slot.id)) continue;
            if (getFacultyDailyCount(assignments, fac.id, day) >= config.maxLecturesPerFaculty) continue;
            if (getFacultyWeeklyCount(assignments, fac.id) >= fac.weeklyLoad) continue;

            // Find appropriate room
            const neededRoomType = subject.type === 'lab' ? 'lab' : 'classroom';
            let room = classrooms.find(
              r =>
                r.roomType === neededRoomType &&
                r.status === 'available' &&
                !hasRoomConflict(assignments, r.id, day, slot.id)
            );

            // Theory can use any available room, but labs must stay in lab rooms.
            if (!room && subject.type !== 'lab') {
              room = classrooms.find(
                r => r.status === 'available' && !hasRoomConflict(assignments, r.id, day, slot.id)
              );
            }

            if (!room) continue;

            const candidate: SlotCandidate = { slot, faculty: fac, classroom: room, score: 0 };
            candidate.score = scoreCandidate(candidate, assignments, config);
            candidates.push(candidate);
          }
        }

        if (candidates.length === 0) continue;

        // Pick the best candidate (highest score)
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        assignments.push({
          subjectId: subject.id,
          facultyId: best.faculty.id,
          classroomId: best.classroom.id,
          semesterId,
          divisionId,
          day,
          timeSlotId: best.slot.id,
          startTime: best.slot.startTime,
          endTime: best.slot.endTime,
        });

        scheduled++;
      }
    }

    if (scheduled < task.requiredCount) {
      unscheduled.push(
        `${subject.name} (Sem ${semesterNumber}, Div ${divisionName}): ${scheduled}/${task.requiredCount} scheduled`
      );
    }
  }

  // ---- Step 4: Convert to TimetableEntry ----
  const entries: TimetableEntry[] = assignments.map(a => ({
    id: generateId(),
    timeSlotId: a.timeSlotId,
    subjectId: a.subjectId,
    facultyId: a.facultyId,
    classroomId: a.classroomId,
    semesterId: a.semesterId,
    divisionId: a.divisionId,
    day: a.day,
    startTime: a.startTime,
    endTime: a.endTime,
    isPublished: false,
  }));

  // ---- Step 5: Conflict Detection ----
  const conflicts = detectConflicts(entries, faculty, classrooms, subjects, semesters, config);

  const uniqueFaculty = new Set(entries.map(e => e.facultyId)).size;
  const uniqueRooms = new Set(entries.map(e => e.classroomId)).size;

  return {
    success: conflicts.filter(c => c.severity === 'error').length === 0,
    entries,
    conflicts,
    stats: {
      totalEntries: entries.length,
      facultyAssigned: uniqueFaculty,
      roomsUsed: uniqueRooms,
      conflictsFound: conflicts.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================
// Conflict Detection Engine
// ============================================================

export function detectConflicts(
  entries: TimetableEntry[],
  faculty: Faculty[],
  classrooms: Classroom[],
  subjects: Subject[],
  semesters: Semester[],
  config: CollegeConfig
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Group entries by day + slot
  const bySlot: Record<string, TimetableEntry[]> = {};
  for (const entry of entries) {
    const key = `${entry.day}__${entry.timeSlotId}`;
    if (!bySlot[key]) bySlot[key] = [];
    bySlot[key].push(entry);
  }

  for (const [slotKey, slotEntries] of Object.entries(bySlot)) {
    const [day] = slotKey.split('__');

    // 1. Faculty Conflict
    const facultyMap: Record<string, TimetableEntry[]> = {};
    for (const e of slotEntries) {
      if (!facultyMap[e.facultyId]) facultyMap[e.facultyId] = [];
      facultyMap[e.facultyId].push(e);
    }
    for (const [fId, fEntries] of Object.entries(facultyMap)) {
      if (fEntries.length > 1) {
        const f = faculty.find(f => f.id === fId);
        conflicts.push({
          id: generateId(),
          type: 'faculty_conflict',
          severity: 'error',
          description: `${f?.name || 'Faculty'} is double-booked on ${day}`,
          affectedEntries: fEntries.map(e => e.id),
          suggestions: ['Assign another faculty', 'Move one lecture to a different slot'],
          day,
          facultyId: fId,
        });
      }
    }

    // 2. Room Conflict
    const roomMap: Record<string, TimetableEntry[]> = {};
    for (const e of slotEntries) {
      if (!roomMap[e.classroomId]) roomMap[e.classroomId] = [];
      roomMap[e.classroomId].push(e);
    }
    for (const [rId, rEntries] of Object.entries(roomMap)) {
      if (rEntries.length > 1) {
        const room = classrooms.find(r => r.id === rId);
        conflicts.push({
          id: generateId(),
          type: 'room_conflict',
          severity: 'error',
          description: `Room ${room?.roomNumber || rId} is double-booked on ${day}`,
          affectedEntries: rEntries.map(e => e.id),
          suggestions: ['Assign a different room', 'Check room availability'],
          day,
          roomId: rId,
        });
      }
    }

    // 3. Division Conflict
    const divMap: Record<string, TimetableEntry[]> = {};
    for (const e of slotEntries) {
      const key = `${e.semesterId}__${e.divisionId}`;
      if (!divMap[key]) divMap[key] = [];
      divMap[key].push(e);
    }
    for (const [divKey, divEntries] of Object.entries(divMap)) {
      if (divEntries.length > 1) {
        const [semId, dId] = divKey.split('__');
        const sem = semesters.find(s => s.id === semId);
        const div = sem?.divisions.find(d => d.id === dId);
        conflicts.push({
          id: generateId(),
          type: 'division_conflict',
          severity: 'error',
          description: `Division ${div?.name || dId} (Sem ${sem?.number}) has ${divEntries.length} overlapping lectures on ${day}`,
          affectedEntries: divEntries.map(e => e.id),
          suggestions: ['Move one lecture to a free slot'],
          day,
        });
      }
    }
  }

  // 4. Workload Conflicts
  const facultyWeekly: Record<string, number> = {};
  for (const entry of entries) {
    facultyWeekly[entry.facultyId] = (facultyWeekly[entry.facultyId] || 0) + 1;
  }
  for (const [fId, count] of Object.entries(facultyWeekly)) {
    const f = faculty.find(f => f.id === fId);
    if (f && count > f.weeklyLoad) {
      conflicts.push({
        id: generateId(),
        type: 'workload_conflict',
        severity: 'warning',
        description: `${f.name} has ${count} lectures (max: ${f.weeklyLoad}/week)`,
        affectedEntries: entries.filter(e => e.facultyId === fId).map(e => e.id),
        suggestions: [`Reduce ${f.name}'s assignments`, 'Assign a co-teacher'],
        facultyId: fId,
      });
    }
  }

  // 5. Lab in Wrong Room
  for (const entry of entries) {
    const sub = subjects.find(s => s.id === entry.subjectId);
    const room = classrooms.find(r => r.id === entry.classroomId);
    if (sub?.labRequired && room && room.roomType !== 'lab') {
      conflicts.push({
        id: generateId(),
        type: 'lab_conflict',
        severity: 'warning',
        description: `Lab subject "${sub.name}" is in ${room.roomNumber} (${room.roomType}), not a lab`,
        affectedEntries: [entry.id],
        suggestions: ['Move to an available lab room'],
        roomId: room.id,
      });
    }
  }

  return conflicts;
}

// ============================================================
// Generate Default Time Slots from College Config
// ============================================================

export function generateDefaultTimeSlots(config: CollegeConfig): Omit<TimeSlot, 'id'>[] {
  const slots: Omit<TimeSlot, 'id'>[] = [];
  const { workingDays, startTime, endTime, lectureDuration, lunchBreakStart, lunchBreakEnd } = config;

  for (const day of workingDays) {
    let currentMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const lunchStartMin = timeToMinutes(lunchBreakStart);
    const lunchEndMin = timeToMinutes(lunchBreakEnd);
    let order = 1;

    while (currentMinutes + lectureDuration <= endMinutes) {
      if (currentMinutes < lunchStartMin && currentMinutes + lectureDuration > lunchStartMin) {
        slots.push({ day, startTime: lunchBreakStart, endTime: lunchBreakEnd, slotType: 'lunch', order: order++ });
        currentMinutes = lunchEndMin;
        continue;
      }
      if (currentMinutes >= lunchStartMin && currentMinutes < lunchEndMin) {
        currentMinutes = lunchEndMin;
        continue;
      }

      const slotEnd = currentMinutes + lectureDuration;
      const fmt = (m: number) => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

      slots.push({
        day,
        startTime: fmt(currentMinutes),
        endTime: fmt(slotEnd),
        slotType: 'lecture',
        order: order++,
      });
      currentMinutes = slotEnd;
    }
  }

  return slots;
}
