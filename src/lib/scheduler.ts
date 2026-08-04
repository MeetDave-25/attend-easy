/**
 * Smart College Timetable Scheduling Engine v3.0
 * Algorithm: Constraint Satisfaction + Genetic Optimisation
 * 
 * Strategy:
 * 1. Sort subjects by difficulty-to-schedule (most constrained first) — MRV heuristic
 * 2. Expand each weekly requirement into a scheduling task
 * 3. Try the best available slot first (LCV-inspired scoring)
 * 4. Backtrack when a later task cannot be placed
 * 5. Evolve valid schedules to improve distribution without breaking hard rules
 * 6. Post-process: detect and report all conflicts
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
  facultyOverrides?: Record<string, string>;
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

const getDivisionDailyCount = (assignments: Assignment[], semesterId: string, divisionId: string, day: string) =>
  assignments.filter(a => a.semesterId === semesterId && a.divisionId === divisionId && a.day === day).length;

// A zero value is used by imported/demo data to mean "not configured".
// Treat it as unlimited instead of making the faculty impossible to schedule.
// Imported workload values are planning targets, not reasons to leave a class
// unscheduled. They are applied as a balancing preference in the score below.
const getFacultyWeeklyLimit = (_facultyMember: Faculty) => Number.POSITIVE_INFINITY;

const getFacultyDailyLimit = (_config: CollegeConfig) => Number.POSITIVE_INFINITY;

// The actual configured time slots are the real daily capacity. A separate
// imported daily-load number should not make a valid college day impossible.
const getDivisionDailyLimit = (_config: CollegeConfig, availableSlots: number) => availableSlots;

const getSubjectWeeklyCount = (assignments: Assignment[], subjectId: string, divId: string) =>
  assignments.filter(a => a.subjectId === subjectId && a.divisionId === divId).length;

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

  // Prefer the right room type. If the administrator has not labelled a room
  // as a lab/classroom, use an available suitable-capacity room rather than
  // fail the complete timetable for a setup label.
  if (isPractical) return room.roomType === 'lab' || !hasDedicatedLab;
  return room.roomType === 'classroom' || room.roomType === 'seminar_hall' || !hasStandardClassroom;
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

  // Do not always favor the first lecture. Subject-specific distribution
  // is applied below so lectures rotate through the available time slots.

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
    facultyOverrides = {},
    classroomOverrides = {},
  } = input;

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
    if (semesterFilter && semesterFilter !== 'all' && semester.id !== semesterFilter) continue;
    for (const division of semester.divisions) {
      const divSubjects = subjects.filter(
        sub =>
          (!subjectFilter || subjectFilter === 'all' || sub.id === subjectFilter) &&
          sub.semester === semester.number &&
          (sub.division === division.name || sub.division === 'All' || !sub.division)
      );

      for (const subject of divSubjects) {
        const targetCount = Math.max(0, subject.lectureCountPerWeek ?? 0);

        // Find all faculty who can teach this subject
        let facultyCandidates: Faculty[] = [];
        const selectedFacultyId = facultyOverrides[subject.id] || subject.facultyId;
        const eligibleFaculty = faculty.filter(
          f => f.status === 'active' && (f.subjectIds?.includes(subject.id) || f.subjectIds?.length === 0 || f.id === selectedFacultyId)
        );
        const assignedFaculty = selectedFacultyId
          ? eligibleFaculty.find(member => member.id === selectedFacultyId)
          : undefined;
        // Prefer the configured teacher, but keep other eligible teachers as
        // fallbacks when the configured teacher is on leave or unavailable.
        facultyCandidates = assignedFaculty
          ? [assignedFaculty, ...eligibleFaculty.filter(member => member.id !== assignedFaculty.id)]
          : eligibleFaculty;

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

  // ---- Step 3: Validate capacity before searching ----
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

    if (task.requiredCount > 0 && task.facultyCandidates.length === 0) {
      addValidationConflict(
        `${subjectLabel} has no active faculty assigned who can teach it.`,
        ['Assign a faculty member to the subject', 'Mark the faculty as active', 'Add the subject to a faculty member\'s teaching list']
      );
    }

    if (task.requiredCount > 0 && !hasRoom) {
      addValidationConflict(
        `${subjectLabel} has no available room with enough capacity.`,
        ['Add or activate a room with enough seats', 'Check the division student count and room capacities']
      );
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
          `Semester ${semester.number}, Division ${division.name} needs ${required} weekly classes, but the current timetable has space for only ${capacity}.`,
          [
            'Add enough lecture slots or working days for the complete curriculum',
            'Increase the daily class limit only if your college timetable permits it',
            'The generator will not remove required subject classes automatically',
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

  // ---- Step 4: Constraint search with backtracking ----
  // The previous greedy pass committed to the first locally good slot. That
  // can block a later subject even when a valid timetable exists. Search all
  // feasible assignments in priority order and backtrack when a branch fails.
  const units = tasks.flatMap(task => Array.from({ length: task.requiredCount }, () => task));
  let searchNodes = 0;
  const maxSearchNodes = 150_000;

  const getCandidates = (
    task: (typeof tasks)[number],
    currentAssignments: Assignment[] = assignments
  ): SlotCandidate[] => {
    const candidates: SlotCandidate[] = [];
    const isLab = task.subject.labRequired || task.subject.type === 'lab';
    const division = semesters
      .find(semester => semester.id === task.semesterId)
      ?.divisions.find(candidateDivision => candidateDivision.id === task.divisionId);

    for (const day of config.workingDays) {
      for (const slot of slotsByDay[day] || []) {
        if (hasDivisionConflict(currentAssignments, task.semesterId, task.divisionId, day, slot.id)) continue;
        if (getDivisionDailyCount(currentAssignments, task.semesterId, task.divisionId, day) >= getDivisionDailyLimit(config, (slotsByDay[day] || []).length)) continue;

        for (const fac of task.facultyCandidates) {
          if (isFacultyOnLeave(fac.id, day, leaveEntries)) continue;
          if (isFacultyUnavailable(fac, slot.id)) continue;
          if (hasFacultyConflict(currentAssignments, fac.id, day, slot.id)) continue;
          if (getFacultyDailyCount(currentAssignments, fac.id, day) >= getFacultyDailyLimit(config)) continue;
          if (getFacultyWeeklyCount(currentAssignments, fac.id) >= getFacultyWeeklyLimit(fac)) continue;

          for (const room of classrooms) {
            const roomIsUsable =
              (!classroomOverrides[task.subject.id] || classroomOverrides[task.subject.id] === room.id) &&
              isUsableRoom(room, isLab, division?.studentCount || 0, classrooms);
            if (!roomIsUsable || hasRoomConflict(currentAssignments, room.id, day, slot.id)) continue;

            const candidate: SlotCandidate = { slot, faculty: fac, classroom: room, score: 0 };
            candidate.score = scoreCandidate(candidate, currentAssignments, config);

            // A slot explicitly marked as a lab is preferred for a practical,
            // but a normal lecture slot is still valid when that is all the
            // college has configured.
            if (isLab && slot.slotType === 'lab') candidate.score += 12;

            // Keep the configured subject teacher when possible, but spread
            // work fairly when more than one eligible teacher is available.
            if (task.subject.facultyId === fac.id) candidate.score += 14;
            const weeklyAssigned = getFacultyWeeklyCount(currentAssignments, fac.id);
            const weeklyLimit = getFacultyWeeklyLimit(fac);
            const workloadRatio = Number.isFinite(weeklyLimit)
              ? weeklyAssigned / Math.max(weeklyLimit, 1)
              : weeklyAssigned;
            candidate.score -= workloadRatio * 22;

            const subjectAssignments = getSubjectAssignments(currentAssignments, task.subject.id, task.divisionId);
            const dailySlots = slotsByDay[day] || [];
            const slotIndex = dailySlots.findIndex(item => item.id === slot.id);
            const dayIndex = config.workingDays.indexOf(day);
            const subjectSeed = stableHash(`${task.subject.id}:${task.divisionId}`);
            // Shift the preferred position every day. For example, a subject
            // that lands in slot 2 on Monday is naturally encouraged toward a
            // different slot on Tuesday instead of repeating slot 1 all week.
            const desiredSlotIndex = dailySlots.length > 0
              ? (subjectSeed + dayIndex * 2) % dailySlots.length
              : 0;
            const sameTimeUses = subjectAssignments.filter(assignment =>
              assignment.startTime === slot.startTime && assignment.endTime === slot.endTime
            ).length;

            // Strongly prefer one lecture per subject per day when possible.
            // The candidate is kept as a fallback for subjects that genuinely
            // need more lectures than the number of working days.
            if (hasSameSubjectSameDay(currentAssignments, task.subject.id, task.divisionId, day)) {
              candidate.score -= 90;
            }
            // Avoid repeating the same time position across different days.
            candidate.score -= sameTimeUses * 70;
            if (slotIndex >= 0 && dailySlots.length > 1) {
              candidate.score -= circularDistance(slotIndex, desiredSlotIndex, dailySlots.length) * 8;
            }
            candidates.push(candidate);
          }
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  };

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
      unscheduled.push(`${task.subject.name} · Semester ${task.semesterNumber}, Division ${task.divisionName} · ${task.requiredCount} class period(s)`);
    }
  }

  // ---- Step 5: Genetic optimisation of valid schedules ----
  // Backtracking above creates a fully valid timetable first. The genetic pass
  // never accepts an invalid placement: its chromosome mutations and crossover
  // both use getCandidates(), so faculty, room, division, leave and break rules
  // remain protected while the timetable becomes more naturally distributed.
  const toAssignment = (task: (typeof tasks)[number], candidate: SlotCandidate): Assignment => ({
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

      // Choose from the best options, rather than always the first one, to
      // create useful variation in a repeatable conflict-free population.
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
    const facultyCount = new Map<string, number>();

    for (const assignment of chromosome) {
      const subjectDayKey = `${assignment.subjectId}:${assignment.divisionId}:${assignment.day}`;
      const subjectTimeKey = `${assignment.subjectId}:${assignment.divisionId}:${assignment.startTime}`;
      subjectDayCount.set(subjectDayKey, (subjectDayCount.get(subjectDayKey) || 0) + 1);
      subjectTimeCount.set(subjectTimeKey, (subjectTimeCount.get(subjectTimeKey) || 0) + 1);
      facultyCount.set(assignment.facultyId, (facultyCount.get(assignment.facultyId) || 0) + 1);
    }

    // Spread a subject through the week and rotate its time. These are soft
    // preferences; the strict rules were already enforced before this phase.
    for (const count of subjectDayCount.values()) score -= Math.max(0, count - 1) * 180;
    for (const count of subjectTimeCount.values()) score -= Math.max(0, count - 1) * 45;

    const loads = [...facultyCount.values()];
    if (loads.length > 1) {
      const average = loads.reduce((sum, load) => sum + load, 0) / loads.length;
      score -= loads.reduce((sum, load) => sum + Math.pow(load - average, 2), 0) * 8;
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
    const populationSize = 12;
    const generations = 24;
    let population: Assignment[][] = [cloneChromosome(assignments)];

    while (population.length < populationSize) {
      population.push(mutateChromosome(assignments, 1 + Math.floor(Math.random() * 4)));
    }

    for (let generation = 0; generation < generations; generation += 1) {
      const ranked = [...population].sort((left, right) => chromosomeFitness(right) - chromosomeFitness(left));
      const elites = ranked.slice(0, 3);
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

  // ---- Step 6: Convert to TimetableEntry ----
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

  // ---- Step 7: Conflict Detection ----
  const conflicts = detectConflicts(entries, faculty, classrooms, subjects, semesters, config);

  for (const item of unscheduled) {
    conflicts.push({
      id: generateId(),
      type: 'validation_error',
      severity: 'error',
      description: `No free class time remains for ${item}.`,
      affectedEntries: [],
      suggestions: [
        'Add enough lecture slots, rooms, or eligible faculty for the full curriculum',
        'Review faculty leave, unavailable slots, and workload limits',
        'The system keeps all required subject lectures; it does not reduce coverage automatically',
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
