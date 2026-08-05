/**
 * Smart College Timetable Scheduling Engine v4.0
 * Algorithm: Constraint Satisfaction + Genetic Optimisation
 *
 * Key Rules (v4 changes):
 * - Visiting faculty  → HARD weekly cap (cannot exceed weeklyLoad)
 * - Permanent faculty → SOFT weekly cap (prefer not to exceed weeklyLoad, but allow if no alternative)
 * - Subject → Faculty binding is STRICT: subject.facultyId is ALWAYS used when set.
 *   The generator NEVER reassigns a subject to a different faculty automatically.
 *   If the designated faculty is on leave for ALL slots, the lecture is left unscheduled
 *   and a clear error is shown.
 * - Genetic phase: never changes faculty assignment, only re-slots days/times
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
  semesterFilter?: string;
  subjectFilter?: string;
  dayFilter?: string;
  classroomOverrides?: Record<string, string>;
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
  score: number;
}

// ============================================================
// Workload helpers
// ============================================================

/** Returns the hard weekly lecture cap for a faculty member.
 *  - Visiting: weeklyLoad is a hard limit (never exceed)
 *  - Permanent: weeklyLoad is a soft preference; hard cap is very large
 */
const getFacultyHardWeeklyLimit = (f: Faculty): number => {
  if (f.type === 'visiting') {
    return f.weeklyLoad > 0 ? f.weeklyLoad : 20;
  }
  // Permanent: hard cap only kicks in at a very high number (don't block)
  return f.weeklyLoad > 0 ? f.weeklyLoad * 3 : Number.POSITIVE_INFINITY;
};

/** Returns the SOFT weekly target — used in scoring to prefer balanced loads */
const getFacultySoftWeeklyTarget = (f: Faculty): number =>
  f.weeklyLoad > 0 ? f.weeklyLoad : 20;

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

const getDivisionDailyCount = (assignments: Assignment[], semesterId: string, divisionId: string, day: string) =>
  assignments.filter(a => a.semesterId === semesterId && a.divisionId === divisionId && a.day === day).length;

const getDivisionDailyLimit = (_config: CollegeConfig, availableSlots: number) => availableSlots;

const getSubjectAssignments = (assignments: Assignment[], subjectId: string, divId: string) =>
  assignments.filter(a => a.subjectId === subjectId && a.divisionId === divId);

const stableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeDivisionName = (value: unknown) => String(value ?? '')
  .trim()
  .toUpperCase()
  .replace(/^DIV(?:ISION)?\s*/, '');

const subjectMatchesDivision = (subjectDivision: unknown, divisionName: string) => {
  const normalized = normalizeDivisionName(subjectDivision);
  if (!normalized || normalized === 'ALL') return true;
  return normalized.split(/[,/&]+/).map(item => item.trim()).includes(normalizeDivisionName(divisionName));
};

const circularDistance = (left: number, right: number, size: number) =>
  Math.min(Math.abs(left - right), size - Math.abs(left - right));

const isDuringLunch = (slot: TimeSlot, config: CollegeConfig) => {
  const s = timeToMinutes(slot.startTime);
  const e = timeToMinutes(slot.endTime);
  const ls = timeToMinutes(config.lunchBreakStart);
  const le = timeToMinutes(config.lunchBreakEnd);
  return s < le && e > ls;
};

const isUsableRoom = (room: Classroom, isPractical: boolean, studentCount: number, rooms: Classroom[]) => {
  if (room.status !== 'available' || room.capacity < studentCount) return false;

  const hasDedicatedLab = rooms.some(candidate =>
    candidate.status === 'available' && candidate.roomType === 'lab' && candidate.capacity >= studentCount
  );
  const hasStandardClassroom = rooms.some(candidate =>
    candidate.status === 'available' &&
    (candidate.roomType === 'classroom' || candidate.roomType === 'seminar_hall') &&
    candidate.capacity >= studentCount
  );

  if (isPractical) return room.roomType === 'lab' || !hasDedicatedLab;
  return room.roomType === 'classroom' || room.roomType === 'seminar_hall' || !hasStandardClassroom;
};

// ============================================================
// Scoring: Evaluate a candidate slot (higher = better choice)
// ============================================================

function scoreCandidate(
  candidate: SlotCandidate,
  assignments: Assignment[],
  config: CollegeConfig,
  task: { subject: Subject; semesterId: string; divisionId: string },
  slotsByDay: Record<string, TimeSlot[]>
): number {
  let score = 100;

  const { slot, faculty } = candidate;
  const day = slot.day;

  // Penalize if faculty is approaching daily load target
  const dailyCount = getFacultyDailyCount(assignments, faculty.id, day);
  const dailyTarget = faculty.dailyLoad > 0 ? faculty.dailyLoad : config.maxLecturesPerFaculty;
  score -= dailyCount * 10;
  if (dailyCount >= dailyTarget) score -= 40;

  // Penalize based on how close they are to soft weekly target
  const weeklyCount = getFacultyWeeklyCount(assignments, faculty.id);
  const softTarget = getFacultySoftWeeklyTarget(faculty);
  const loadRatio = weeklyCount / Math.max(softTarget, 1);
  score -= loadRatio * 30;

  // Strong bonus for preferred slots
  if (faculty.preferredSlots?.includes(slot.id)) score += 20;

  // Penalize if same subject is already on this day
  if (hasSameSubjectSameDay(assignments, task.subject.id, task.divisionId, day)) {
    score -= 90;
  }

  // Spread subject across different time positions
  const subjectAssignments = getSubjectAssignments(assignments, task.subject.id, task.divisionId);
  const dailySlots = slotsByDay[day] || [];
  const slotIndex = dailySlots.findIndex(item => item.id === slot.id);
  const dayIndex = config.workingDays.indexOf(day);
  const subjectSeed = stableHash(`${task.subject.id}:${task.divisionId}`);
  const desiredSlotIndex = dailySlots.length > 0
    ? (subjectSeed + dayIndex * 2) % dailySlots.length
    : 0;
  const sameTimeUses = subjectAssignments.filter(assignment =>
    assignment.startTime === slot.startTime && assignment.endTime === slot.endTime
  ).length;

  score -= sameTimeUses * 70;
  if (slotIndex >= 0 && dailySlots.length > 1) {
    score -= circularDistance(slotIndex, desiredSlotIndex, dailySlots.length) * 8;
  }

  return score;
}

// ============================================================
// Main Scheduler with Backtracking + Genetic Optimisation
// ============================================================

export function generateTimetable(input: SchedulerInput): GenerationResult {
  const {
    config,
    faculty,
    subjects,
    classrooms,
    semesters,
    timeSlots,
    leaveEntries,
    semesterFilter,
    subjectFilter,
    dayFilter,
    classroomOverrides = {},
  } = input;

  const assignments: Assignment[] = [];
  const unscheduled: string[] = [];

  const workingDays = dayFilter ? config.workingDays.filter(d => d === dayFilter) : config.workingDays;

  // Filter usable lecture slots
  const lectureSlots = timeSlots.filter(
    ts => (ts.slotType === 'lecture' || ts.slotType === 'lab') && !isDuringLunch(ts, config)
  );

  // Group slots by day
  const slotsByDay: Record<string, TimeSlot[]> = {};
  lectureSlots.forEach(slot => {
    if (!slotsByDay[slot.day]) slotsByDay[slot.day] = [];
    slotsByDay[slot.day].push(slot);
  });
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
    /** STRICT: only the designated faculty — never randomly assigned */
    designatedFaculty: Faculty | null;
    /** Fallback: only used if designatedFaculty is null (subject has no facultyId) */
    fallbackFacultyCandidates: Faculty[];
  }

  const tasks: Task[] = [];

  for (const semester of semesters) {
    if (semesterFilter && semesterFilter !== 'all' && semester.id !== semesterFilter) continue;
    for (const division of semester.divisions) {
      const divSubjects = subjects.filter(
        sub =>
          (!subjectFilter || subjectFilter === 'all' || sub.id === subjectFilter) &&
          Number(sub.semester) === Number(semester.number) &&
          subjectMatchesDivision(sub.division, division.name)
      );

      for (const subject of divSubjects) {
        const targetCount = Math.max(0, subject.lectureCountPerWeek ?? 0);

        // STRICT binding: if subject has a facultyId, that faculty is THE only option
        let designatedFaculty: Faculty | null = null;
        let fallbackFacultyCandidates: Faculty[] = [];

        if (subject.facultyId) {
          const found = faculty.find(f => f.id === subject.facultyId && f.status === 'active');
          designatedFaculty = found ?? null;
          // If designated faculty exists but is inactive/not found → error will be caught in validation
        } else {
          // No faculty assigned → allow any active faculty who can teach this subject
          fallbackFacultyCandidates = faculty.filter(
            f => f.status === 'active' && (f.subjectIds?.includes(subject.id) || f.subjectIds?.length === 0)
          );
        }

        tasks.push({
          subject,
          semesterId: semester.id,
          divisionId: division.id,
          divisionName: division.name,
          semesterNumber: semester.number,
          requiredCount: dayFilter ? Math.min(targetCount, 1) : targetCount,
          scheduledCount: 0,
          designatedFaculty,
          fallbackFacultyCandidates,
        });
      }
    }
  }

  // ---- Step 2: Sort tasks by difficulty (hardest first) ----
  tasks.sort((a, b) => {
    const availA = a.designatedFaculty ? 1 : a.fallbackFacultyCandidates.length;
    const availB = b.designatedFaculty ? 1 : b.fallbackFacultyCandidates.length;
    const hardnessA = (1 / (availA + 1)) * 100 + a.requiredCount + (a.subject.labRequired ? 20 : 0);
    const hardnessB = (1 / (availB + 1)) * 100 + b.requiredCount + (b.subject.labRequired ? 20 : 0);
    return hardnessB - hardnessA;
  });

  // ---- Step 3: Pre-generation validation ----
  const validationConflicts: Conflict[] = [];
  const addValidationConflict = (description: string, suggestions: string[]) => {
    validationConflicts.push({
      id: generateId(),
      type: 'validation_error',
      severity: 'error',
      description,
      affectedEntries: [],
      suggestions,
    });
  };

  if (config.workingDays.length === 0 || lectureSlots.length === 0) {
    addValidationConflict(
      'No usable lecture slots are configured for the selected working days.',
      ['Add working days', 'Create lecture time slots outside the lunch break']
    );
  }

  for (const task of tasks) {
    const subjectLabel = `${task.subject.name} (Sem ${task.semesterNumber}, Div ${task.divisionName})`;
    const isLab = task.subject.labRequired || task.subject.type === 'lab';
    const studentCount = semesters.find(s => s.id === task.semesterId)?.divisions.find(d => d.id === task.divisionId)?.studentCount || 0;

    const hasRoom = classrooms.some(room =>
      (!classroomOverrides[task.subject.id] || classroomOverrides[task.subject.id] === room.id) &&
      isUsableRoom(room, isLab, studentCount, classrooms)
    );

    if (task.requiredCount > 0 && !hasRoom) {
      addValidationConflict(
        `${subjectLabel} has no available ${isLab ? 'lab' : 'classroom'} with enough capacity (needs ${studentCount} seats).`,
        [`Add or activate a ${isLab ? 'lab' : 'classroom'} with at least ${studentCount} seats`, 'Check the division student count and room capacities']
      );
    }

    if (task.requiredCount > 0) {
      if (task.subject.facultyId) {
        // Subject has a designated faculty — check if they exist and are active
        const designatedFaculty = faculty.find(f => f.id === task.subject.facultyId);
        if (!designatedFaculty) {
          addValidationConflict(
            `${subjectLabel}: The assigned faculty no longer exists. Please reassign this subject.`,
            ['Go to Subjects and select a new faculty for this subject']
          );
        } else if (designatedFaculty.status !== 'active') {
          addValidationConflict(
            `${subjectLabel}: ${designatedFaculty.name} is ${designatedFaculty.status === 'on-leave' ? 'on leave' : 'inactive'} and cannot be scheduled. This subject will remain unscheduled.`,
            [`Mark ${designatedFaculty.name} as Active`, 'Or reassign this subject to another faculty in the Subjects page']
          );
        } else if (designatedFaculty.type === 'visiting') {
          // Visiting faculty — check if weeklyLoad is enough for all their subjects
          const totalNeeded = tasks
            .filter(t => t.subject.facultyId === designatedFaculty.id)
            .reduce((sum, t) => sum + t.requiredCount, 0);
          const hardLimit = getFacultyHardWeeklyLimit(designatedFaculty);
          if (totalNeeded > hardLimit) {
            addValidationConflict(
              `Visiting faculty ${designatedFaculty.name} is assigned ${totalNeeded} lectures/week but their weekly limit is ${hardLimit}. Some lectures will be unscheduled.`,
              [
                `Increase ${designatedFaculty.name}'s weekly limit to at least ${totalNeeded}`,
                'Or reduce the lecture count for one of their subjects',
              ]
            );
          }
        }
      } else if (task.fallbackFacultyCandidates.length === 0) {
        addValidationConflict(
          `${subjectLabel} has no faculty assigned and no active faculty can teach it.`,
          ['Go to Subjects and assign a faculty member', 'Or mark an eligible faculty as Active']
        );
      }
    }
  }

  for (const semester of semesters) {
    for (const division of semester.divisions) {
      const divisionTasks = tasks.filter(task => task.divisionId === division.id);
      const required = divisionTasks.reduce((total, task) => total + task.requiredCount, 0);
      const capacity = config.workingDays.reduce((total, day) => {
        const availableSlots = (slotsByDay[day] || []).length;
        return total + getDivisionDailyLimit(config, availableSlots);
      }, 0);

      if (required > capacity) {
        addValidationConflict(
          `Semester ${semester.number}, Division ${division.name} needs ${required} lectures/week but your timetable only has ${capacity} available slots. Add more time slots or reduce lecture counts.`,
          [
            `You need ${required - capacity} more lecture slot(s) per week`,
            'Add time slots in the Time Slots section',
            'Or reduce lectureCountPerWeek on one or more subjects',
          ]
        );
      }
    }
  }

  if (validationConflicts.length > 0) {
    return {
      success: false,
      entries: [],
      conflicts: validationConflicts,
      stats: {
        totalEntries: 0,
        facultyAssigned: 0,
        roomsUsed: 0,
        conflictsFound: validationConflicts.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ---- Step 4: Build units list (one unit per lecture needed) ----
  const units = tasks.flatMap(task => Array.from({ length: task.requiredCount }, () => task));

  // ---- Step 5: Candidate generator ----
  const getCandidates = (
    task: Task,
    currentAssignments: Assignment[] = assignments
  ): SlotCandidate[] => {
    const candidates: SlotCandidate[] = [];
    const isLab = task.subject.labRequired || task.subject.type === 'lab';
    const division = semesters
      .find(semester => semester.id === task.semesterId)
      ?.divisions.find(candidateDivision => candidateDivision.id === task.divisionId);
    const studentCount = division?.studentCount || 0;

    // STRICT: only use the designated faculty, or fallbacks if no designation
    const facultyCandidates: Faculty[] = task.designatedFaculty
      ? [task.designatedFaculty]
      : task.fallbackFacultyCandidates;

    for (const day of workingDays) {
      for (const slot of slotsByDay[day] || []) {
        if (hasDivisionConflict(currentAssignments, task.semesterId, task.divisionId, day, slot.id)) continue;
        if (getDivisionDailyCount(currentAssignments, task.semesterId, task.divisionId, day) >= getDivisionDailyLimit(config, (slotsByDay[day] || []).length)) continue;

        for (const fac of facultyCandidates) {
          if (isFacultyOnLeave(fac.id, day, leaveEntries)) continue;
          if (isFacultyUnavailable(fac, slot.id)) continue;
          if (hasFacultyConflict(currentAssignments, fac.id, day, slot.id)) continue;

          // Daily limit check
          const dailyTarget = fac.dailyLoad > 0 ? fac.dailyLoad : config.maxLecturesPerFaculty;
          if (getFacultyDailyCount(currentAssignments, fac.id, day) >= dailyTarget) continue;

          // Weekly limit check — HARD for visiting, soft but high for permanent
          const weeklyCount = getFacultyWeeklyCount(currentAssignments, fac.id);
          const hardLimit = getFacultyHardWeeklyLimit(fac);
          if (weeklyCount >= hardLimit) continue;

          for (const room of classrooms) {
            const roomIsUsable =
              (!classroomOverrides[task.subject.id] || classroomOverrides[task.subject.id] === room.id) &&
              isUsableRoom(room, isLab, studentCount, classrooms);
            if (!roomIsUsable || hasRoomConflict(currentAssignments, room.id, day, slot.id)) continue;

            const candidate: SlotCandidate = { slot, faculty: fac, classroom: room, score: 0 };
            candidate.score = scoreCandidate(candidate, currentAssignments, config, task, slotsByDay);

            if (isLab && slot.slotType === 'lab') candidate.score += 12;

            candidates.push(candidate);
          }
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  };

  // ---- Step 6: Backtracking search ----
  let searchNodes = 0;
  const maxSearchNodes = 150_000;

  const search = (index: number): boolean => {
    if (index === units.length) return true;
    if (++searchNodes > maxSearchNodes) return false;

    const task = units[index];
    for (const candidate of getCandidates(task)) {
      assignments.push({
        subjectId: task.subject.id,
        facultyId: candidate.faculty.id,
        classroomId: candidate.classroom.id,
        semesterId: task.semesterId,
        divisionId: task.divisionId,
        day: candidate.slot.day,
        timeSlotId: candidate.slot.id,
        startTime: candidate.slot.startTime,
        endTime: candidate.slot.endTime,
      });

      if (search(index + 1)) return true;
      assignments.pop();
    }
    return false;
  };

  if (!search(0)) {
    for (const task of tasks) {
      const facultyName = task.designatedFaculty?.name ||
        (task.fallbackFacultyCandidates.length > 0 ? 'available faculty' : 'no faculty');
      unscheduled.push(
        `${task.subject.name} · Sem ${task.semesterNumber} Div ${task.divisionName} · ${task.requiredCount} lectures · Faculty: ${facultyName}`
      );
    }
  }

  // ---- Step 7: Genetic optimisation (only re-slots, never re-assigns faculty) ----
  const toAssignment = (task: Task, candidate: SlotCandidate): Assignment => ({
    subjectId: task.subject.id,
    facultyId: candidate.faculty.id,
    classroomId: candidate.classroom.id,
    semesterId: task.semesterId,
    divisionId: task.divisionId,
    day: candidate.slot.day,
    timeSlotId: candidate.slot.id,
    startTime: candidate.slot.startTime,
    endTime: candidate.slot.endTime,
  });

  const samePlacement = (assignment: Assignment, candidate: SlotCandidate) =>
    assignment.timeSlotId === candidate.slot.id &&
    assignment.facultyId === candidate.faculty.id &&
    assignment.classroomId === candidate.classroom.id;

  const cloneChromosome = (chromosome: Assignment[]) => chromosome.map(assignment => ({ ...assignment }));

  const mutateChromosome = (source: Assignment[], mutations: number): Assignment[] => {
    const chromosome = cloneChromosome(source);
    for (let attempt = 0; attempt < mutations; attempt += 1) {
      const index = Math.floor(Math.random() * chromosome.length);
      const remaining = chromosome.filter((_, itemIndex) => itemIndex !== index);
      const candidates = getCandidates(units[index], remaining);
      if (candidates.length === 0) continue;

      // NOTE: getCandidates() respects strict faculty binding, so mutations never
      // change which faculty teaches a subject — only the day/time/room.
      const choiceRange = Math.min(candidates.length, 8);
      const candidate = candidates[Math.floor(Math.random() * choiceRange)];
      chromosome[index] = toAssignment(units[index], candidate);
    }
    return chromosome;
  };

  const chromosomeFitness = (chromosome: Assignment[]) => {
    let score = 100_000;
    const subjectDayCount = new Map<string, number>();
    const subjectTimeCount = new Map<string, number>();
    const facultyDailyCount = new Map<string, number>();
    const facultyWeeklyCount = new Map<string, number>();

    for (const assignment of chromosome) {
      const subjectDayKey = `${assignment.subjectId}:${assignment.divisionId}:${assignment.day}`;
      const subjectTimeKey = `${assignment.subjectId}:${assignment.divisionId}:${assignment.startTime}`;
      const facultyDayKey = `${assignment.facultyId}:${assignment.day}`;

      subjectDayCount.set(subjectDayKey, (subjectDayCount.get(subjectDayKey) || 0) + 1);
      subjectTimeCount.set(subjectTimeKey, (subjectTimeCount.get(subjectTimeKey) || 0) + 1);
      facultyDailyCount.set(facultyDayKey, (facultyDailyCount.get(facultyDayKey) || 0) + 1);
      facultyWeeklyCount.set(assignment.facultyId, (facultyWeeklyCount.get(assignment.facultyId) || 0) + 1);
    }

    // Spread subjects across the week
    for (const count of subjectDayCount.values()) score -= Math.max(0, count - 1) * 180;
    // Vary the time position of repeated subjects
    for (const count of subjectTimeCount.values()) score -= Math.max(0, count - 1) * 45;

    // Penalize faculty over-concentrated days
    for (const [key, count] of facultyDailyCount.entries()) {
      const facultyId = key.split(':')[0];
      const fac = faculty.find(f => f.id === facultyId);
      const dailyTarget = fac?.dailyLoad && fac.dailyLoad > 0 ? fac.dailyLoad : config.maxLecturesPerFaculty;
      if (count > dailyTarget) score -= (count - dailyTarget) * 60;
    }

    // Penalize faculty over soft weekly target (hard cap is already enforced in getCandidates)
    for (const [facultyId, count] of facultyWeeklyCount.entries()) {
      const fac = faculty.find(f => f.id === facultyId);
      if (!fac) continue;
      const softTarget = getFacultySoftWeeklyTarget(fac);
      if (count > softTarget) score -= (count - softTarget) * 50;
    }

    // Balanced load distribution
    const loads = [...facultyWeeklyCount.values()];
    if (loads.length > 1) {
      const average = loads.reduce((sum, load) => sum + load, 0) / loads.length;
      score -= loads.reduce((sum, load) => sum + Math.pow(load - average, 2), 0) * 5;
    }

    return score;
  };

  const crossover = (left: Assignment[], right: Assignment[]): Assignment[] | null => {
    const child: Assignment[] = [];
    for (let index = 0; index < units.length; index += 1) {
      const candidates = getCandidates(units[index], child);
      if (candidates.length === 0) return null;

      const inherited = Math.random() < 0.5 ? left[index] : right[index];
      const inheritedCandidate = candidates.find(candidate => samePlacement(inherited, candidate));
      const fallback = candidates[Math.floor(Math.random() * Math.min(candidates.length, 4))];
      child.push(toAssignment(units[index], inheritedCandidate || fallback));
    }
    return child;
  };

  if (assignments.length === units.length && units.length > 1) {
    const populationSize = 14;
    const generations = 28;
    let population: Assignment[][] = [cloneChromosome(assignments)];

    while (population.length < populationSize) {
      population.push(mutateChromosome(assignments, 1 + Math.floor(Math.random() * 4)));
    }

    for (let generation = 0; generation < generations; generation += 1) {
      const ranked = [...population].sort((left, right) => chromosomeFitness(right) - chromosomeFitness(left));
      const elites = ranked.slice(0, 4);
      const nextPopulation = elites.map(cloneChromosome);

      while (nextPopulation.length < populationSize) {
        const parentA = elites[Math.floor(Math.random() * elites.length)];
        const parentB = elites[Math.floor(Math.random() * elites.length)];
        const child = crossover(parentA, parentB) || cloneChromosome(parentA);
        nextPopulation.push(mutateChromosome(child, 1 + Math.floor(Math.random() * 3)));
      }
      population = nextPopulation;
    }

    const best = population.reduce((winner, chromosome) =>
      chromosomeFitness(chromosome) > chromosomeFitness(winner) ? chromosome : winner
    );
    assignments.splice(0, assignments.length, ...best);
  }

  // ---- Step 8: Convert to TimetableEntry ----
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

  // ---- Step 9: Conflict Detection ----
  const conflicts = detectConflicts(entries, faculty, classrooms, subjects, semesters, config);

  for (const item of unscheduled) {
    conflicts.push({
      id: generateId(),
      type: 'validation_error',
      severity: 'error',
      description: `Could not schedule: ${item}`,
      affectedEntries: [],
      suggestions: [
        'Check that the faculty is Active and not on leave',
        'Ensure there are enough time slots for all required lectures',
        'For visiting faculty: verify their weekly limit covers all assigned subjects',
      ],
    });
  }

  const uniqueFaculty = new Set(entries.map(e => e.facultyId)).size;
  const uniqueRooms = new Set(entries.map(e => e.classroomId)).size;

  return {
    success: unscheduled.length === 0 && !conflicts.some(conflict => conflict.severity === 'error'),
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
          description: `${f?.name || 'A faculty member'} is double-booked on ${day} — 2 lectures at the same time.`,
          affectedEntries: fEntries.map(e => e.id),
          suggestions: [
            `Move one of ${f?.name || 'their'} lectures to a free slot`,
            'Check if both subjects require this faculty at the same time',
          ],
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
          description: `Room ${room?.roomNumber || rId} has ${rEntries.length} classes booked at the same time on ${day}.`,
          affectedEntries: rEntries.map(e => e.id),
          suggestions: ['Assign a different room to one of these classes', 'Add more classrooms if needed'],
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
          description: `Division ${div?.name || dId} (Sem ${sem?.number}) has ${divEntries.length} classes at the same time on ${day}. Students can't be in two places at once.`,
          affectedEntries: divEntries.map(e => e.id),
          suggestions: ['Move one lecture to a different time slot on the same day'],
          day,
        });
      }
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
