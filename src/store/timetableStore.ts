import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CollegeConfig, Faculty, Subject, Classroom, Semester, Division,
  TimeSlot, TimetableEntry, Conflict, Request, Notification, User,
  LeaveEntry, GenerationResult,
} from '@/types';
import { generateId } from '@/lib/utils';

interface TimetableState {
  // Auth
  currentUser: User | null;
  isDarkMode: boolean;

  // College Config
  collegeConfig: CollegeConfig;

  // Master Data
  faculty: Faculty[];
  subjects: Subject[];
  classrooms: Classroom[];
  semesters: Semester[];
  timeSlots: TimeSlot[];

  // Timetable
  timetableEntries: TimetableEntry[];
  isPublished: boolean;
  generationResult: GenerationResult | null;

  // Conflicts
  conflicts: Conflict[];

  // Requests & Leave
  requests: Request[];
  leaveEntries: LeaveEntry[];

  // Notifications
  notifications: Notification[];

  // UI State
  isGenerating: boolean;
  activeView: string;
  selectedSemesterId: string;
  selectedDivisionId: string;

  // Actions — Auth
  setCurrentUser: (user: User | null) => void;
  toggleDarkMode: () => void;

  // Actions — Config
  updateCollegeConfig: (config: Partial<CollegeConfig>) => void;

  // Actions — Faculty
  addFaculty: (faculty: Omit<Faculty, 'id'>) => void;
  addFacultyMany: (faculty: Omit<Faculty, 'id'>[]) => void;
  updateFaculty: (id: string, updates: Partial<Faculty>) => void;
  deleteFaculty: (id: string) => void;

  // Actions — Subjects
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  addSubjectMany: (subjects: Omit<Subject, 'id'>[]) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Actions — Classrooms
  addClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  addClassroomMany: (classrooms: Omit<Classroom, 'id'>[]) => void;
  updateClassroom: (id: string, updates: Partial<Classroom>) => void;
  deleteClassroom: (id: string) => void;

  // Actions — Semesters
  addSemester: (semester: Omit<Semester, 'id'>) => void;
  addSemesterMany: (semesters: Omit<Semester, 'id'>[]) => void;
  updateSemester: (id: string, updates: Partial<Semester>) => void;
  deleteSemester: (id: string) => void;
  addDivision: (semesterId: string, division: Omit<Division, 'id' | 'semesterId'>) => void;
  updateDivision: (semesterId: string, divisionId: string, updates: Partial<Division>) => void;
  deleteDivision: (semesterId: string, divisionId: string) => void;

  // Actions — Time Slots
  addTimeSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => void;
  deleteTimeSlot: (id: string) => void;
  setTimeSlots: (slots: TimeSlot[]) => void;

  // Actions — Timetable
  setTimetableEntries: (entries: TimetableEntry[]) => void;
  updateTimetableEntry: (id: string, updates: Partial<TimetableEntry>) => void;
  deleteTimetableEntry: (id: string) => void;
  publishTimetable: () => void;
  unpublishTimetable: () => void;
  setGenerationResult: (result: GenerationResult | null) => void;
  setIsGenerating: (val: boolean) => void;
  setConflicts: (conflicts: Conflict[]) => void;
  hydrateSharedData: (data: {
    collegeConfig?: CollegeConfig;
    faculty?: Faculty[];
    subjects?: Subject[];
    classrooms?: Classroom[];
    semesters?: Semester[];
    timeSlots?: TimeSlot[];
    timetableEntries?: TimetableEntry[];
    notifications?: Notification[];
  }) => void;

  // Actions — Requests
  addRequest: (req: Omit<Request, 'id' | 'createdAt'>) => void;
  updateRequest: (id: string, updates: Partial<Request>) => void;
  deleteRequest: (id: string) => void;

  // Actions — Leave
  addLeave: (leave: Omit<LeaveEntry, 'id'>) => void;
  updateLeave: (id: string, updates: Partial<LeaveEntry>) => void;

  // Actions — Notifications
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Actions — UI
  setActiveView: (view: string) => void;
  setSelectedSemester: (id: string) => void;
  setSelectedDivision: (id: string) => void;

  // Actions — Testing
  loadDummyData: () => void;
  clearData: () => void;
}

const defaultCollegeConfig: CollegeConfig = {
  collegeName: 'My College',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  startTime: '09:00',
  endTime: '17:00',
  lectureDuration: 60,
  lunchBreakStart: '13:00',
  lunchBreakEnd: '14:00',
  shortBreakDuration: 10,
  maxLecturesPerDay: 6,
  maxLecturesPerFaculty: 4,
  semesterCount: 8,
  divisionCount: 3,
  isConfigured: false,
};

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentUser: null,
      isDarkMode: false,
      collegeConfig: defaultCollegeConfig,
      faculty: [],
      subjects: [],
      classrooms: [],
      semesters: [],
      timeSlots: [],
      timetableEntries: [],
      isPublished: false,
      generationResult: null,
      conflicts: [],
      requests: [],
      leaveEntries: [],
      notifications: [],
      isGenerating: false,
      activeView: 'weekly',
      selectedSemesterId: '',
      selectedDivisionId: '',

      // Auth
      setCurrentUser: (user) => set({ currentUser: user }),
      toggleDarkMode: () => {
        const next = !get().isDarkMode;
        set({ isDarkMode: next });
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      // Config
      updateCollegeConfig: (config) =>
        set((s) => ({ collegeConfig: { ...s.collegeConfig, ...config } })),

      // Faculty
      addFaculty: (f) =>
        set((s) => ({ faculty: [...s.faculty, { ...f, id: generateId() }] })),
      addFacultyMany: (faculty) =>
        set((s) => ({ faculty: [...s.faculty, ...faculty.map((member) => ({ ...member, id: generateId() }))] })),
      updateFaculty: (id, updates) =>
        set((s) => ({ faculty: s.faculty.map((f) => (f.id === id ? { ...f, ...updates } : f)) })),
      deleteFaculty: (id) =>
        set((s) => ({ faculty: s.faculty.filter((f) => f.id !== id) })),

      // Subjects
      addSubject: (sub) =>
        set((s) => ({ subjects: [...s.subjects, { ...sub, id: generateId() }] })),
      addSubjectMany: (subjects) =>
        set((s) => ({ subjects: [...s.subjects, ...subjects.map((subject) => ({ ...subject, id: generateId() }))] })),
      updateSubject: (id, updates) =>
        set((s) => ({ subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)) })),
      deleteSubject: (id) =>
        set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) })),

      // Classrooms
      addClassroom: (room) =>
        set((s) => ({ classrooms: [...s.classrooms, { ...room, id: generateId() }] })),
      addClassroomMany: (classrooms) =>
        set((s) => ({ classrooms: [...s.classrooms, ...classrooms.map((room) => ({ ...room, id: generateId() }))] })),
      updateClassroom: (id, updates) =>
        set((s) => ({ classrooms: s.classrooms.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
      deleteClassroom: (id) =>
        set((s) => ({ classrooms: s.classrooms.filter((r) => r.id !== id) })),

      // Semesters
      addSemester: (sem) =>
        set((s) => ({ semesters: [...s.semesters, { ...sem, id: generateId() }] })),
      addSemesterMany: (semesters) =>
        set((s) => ({ semesters: [...s.semesters, ...semesters.map((semester) => ({ ...semester, id: generateId() }))] })),
      updateSemester: (id, updates) =>
        set((s) => ({ semesters: s.semesters.map((sem) => (sem.id === id ? { ...sem, ...updates } : sem)) })),
      deleteSemester: (id) =>
        set((s) => ({ semesters: s.semesters.filter((sem) => sem.id !== id) })),
      addDivision: (semesterId, div) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id === semesterId
              ? { ...sem, divisions: [...sem.divisions, { ...div, id: generateId(), semesterId }] }
              : sem
          ),
        })),
      updateDivision: (semesterId, divisionId, updates) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id === semesterId
              ? {
                  ...sem,
                  divisions: sem.divisions.map((d) =>
                    d.id === divisionId ? { ...d, ...updates } : d
                  ),
                }
              : sem
          ),
        })),
      deleteDivision: (semesterId, divisionId) =>
        set((s) => ({
          semesters: s.semesters.map((sem) =>
            sem.id === semesterId
              ? { ...sem, divisions: sem.divisions.filter((d) => d.id !== divisionId) }
              : sem
          ),
        })),

      // Time Slots
      addTimeSlot: (slot) =>
        set((s) => ({ timeSlots: [...s.timeSlots, { ...slot, id: generateId() }] })),
      updateTimeSlot: (id, updates) =>
        set((s) => ({ timeSlots: s.timeSlots.map((ts) => (ts.id === id ? { ...ts, ...updates } : ts)) })),
      deleteTimeSlot: (id) =>
        set((s) => ({ timeSlots: s.timeSlots.filter((ts) => ts.id !== id) })),
      setTimeSlots: (slots) => set({ timeSlots: slots }),

      // Timetable
      setTimetableEntries: (entries) => set({ timetableEntries: entries }),
      updateTimetableEntry: (id, updates) =>
        set((s) => ({
          timetableEntries: s.timetableEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteTimetableEntry: (id) =>
        set((s) => ({ timetableEntries: s.timetableEntries.filter((e) => e.id !== id) })),
      publishTimetable: () => {
        set({ isPublished: true });
        get().addNotification({
          type: 'timetable_published',
          title: 'Timetable Published',
          message: 'The timetable has been published successfully.',
          forRole: 'all',
        });
      },
      unpublishTimetable: () => set({ isPublished: false }),
      setGenerationResult: (result) => set({ generationResult: result }),
      setIsGenerating: (val) => set({ isGenerating: val }),
      setConflicts: (conflicts) => set({ conflicts }),
      hydrateSharedData: (data) => set((state) => ({
        ...state,
        ...(data.collegeConfig ? { collegeConfig: data.collegeConfig } : {}),
        ...(Array.isArray(data.faculty) ? { faculty: data.faculty } : {}),
        ...(Array.isArray(data.subjects) ? { subjects: data.subjects } : {}),
        ...(Array.isArray(data.classrooms) ? { classrooms: data.classrooms } : {}),
        ...(Array.isArray(data.semesters) ? {
          semesters: data.semesters.map((semester) => ({
            ...semester,
            divisions: Array.isArray(semester.divisions) ? semester.divisions : [],
          })),
        } : {}),
        ...(Array.isArray(data.timeSlots) ? { timeSlots: data.timeSlots } : {}),
        ...(Array.isArray(data.timetableEntries) ? { timetableEntries: data.timetableEntries } : {}),
        ...(Array.isArray(data.notifications) ? { notifications: data.notifications } : {}),
        generationResult: null,
        conflicts: [],
      })),

      // Requests
      addRequest: (req) =>
        set((s) => ({
          requests: [
            ...s.requests,
            { ...req, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),
      updateRequest: (id, updates) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      deleteRequest: (id) =>
        set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),

      // Leave
      addLeave: (leave) =>
        set((s) => ({ leaveEntries: [...s.leaveEntries, { ...leave, id: generateId() }] })),
      updateLeave: (id, updates) =>
        set((s) => ({
          leaveEntries: s.leaveEntries.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

      // Notifications
      addNotification: (notif) =>
        set((s) => ({
          notifications: [
            {
              ...notif,
              id: generateId(),
              createdAt: new Date().toISOString(),
              isRead: false,
            },
            ...s.notifications,
          ],
        })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // UI
      setActiveView: (view) => set({ activeView: view }),
      setSelectedSemester: (id) => set({ selectedSemesterId: id }),
      setSelectedDivision: (id) => set({ selectedDivisionId: id }),

      // Testing Tools
      loadDummyData: () => {
        const f1Id = generateId();
        const f2Id = generateId();
        const s1Id = generateId();
        const s2Id = generateId();
        const c1Id = generateId();
        const semId = generateId();
        
        const timeSlots: TimeSlot[] = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        days.forEach(day => {
          timeSlots.push({ id: generateId(), day, startTime: '09:00', endTime: '10:00', slotType: 'lecture' as const, order: 1 });
          timeSlots.push({ id: generateId(), day, startTime: '10:00', endTime: '11:00', slotType: 'lecture' as const, order: 2 });
          timeSlots.push({ id: generateId(), day, startTime: '11:00', endTime: '12:00', slotType: 'lecture' as const, order: 3 });
        });

        set({
          collegeConfig: { ...defaultCollegeConfig, isConfigured: true },
          faculty: [
            { 
              id: f1Id, name: 'Dr. Alan Turing', email: 'alan@test.com', department: 'CS', 
              designation: 'Professor', subjectIds: [s1Id], preferredSlots: [], unavailableSlots: [], 
              weeklyLoad: 0, dailyLoad: 0, status: 'active', phone: '1234'
            },
            { 
              id: f2Id, name: 'Grace Hopper', email: 'grace@test.com', department: 'CS', 
              designation: 'Associate Professor', subjectIds: [s2Id], preferredSlots: [], unavailableSlots: [], 
              weeklyLoad: 0, dailyLoad: 0, status: 'active', phone: '1234'
            }
          ],
          subjects: [
            { 
              id: s1Id, name: 'Intro to CS', code: 'CS101', semester: 1, division: 'A', 
              facultyId: f1Id, lectureCountPerWeek: 3, labRequired: false, theoryHours: 3, 
              labHours: 0, credits: 3, type: 'theory', year: 1 
            },
            { 
              id: s2Id, name: 'Data Structures', code: 'CS102', semester: 1, division: 'A', 
              facultyId: f2Id, lectureCountPerWeek: 4, labRequired: false, theoryHours: 3,
              labHours: 0, credits: 4, type: 'theory', year: 1
            }
          ],
          classrooms: [
            { 
              id: c1Id, roomNumber: 'Room 101', capacity: 60, roomType: 'classroom', 
              equipment: ['Projector'], status: 'available', floor: 1, block: 'A' 
            }
          ],
          semesters: [
            { 
              id: semId, number: 1, year: 1, isActive: true, divisions: [
                { id: generateId(), semesterId: semId, name: 'A', studentCount: 50, subjectIds: [s1Id, s2Id] }
              ] 
            }
          ],
          timeSlots
        });
      },
      clearData: () => {
        set({
          collegeConfig: defaultCollegeConfig,
          faculty: [],
          subjects: [],
          classrooms: [],
          semesters: [],
          timeSlots: [],
          timetableEntries: [],
          conflicts: [],
          generationResult: null,
          requests: [],
          leaveEntries: [],
          notifications: []
        });
      }
    }),
    {
      name: 'smart-timetable-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isDarkMode: state.isDarkMode,
        collegeConfig: state.collegeConfig,
        faculty: state.faculty,
        subjects: state.subjects,
        classrooms: state.classrooms,
        semesters: state.semesters,
        timeSlots: state.timeSlots,
        timetableEntries: state.timetableEntries,
        isPublished: state.isPublished,
        requests: state.requests,
        leaveEntries: state.leaveEntries,
        notifications: state.notifications,
        generationResult: state.generationResult,
        conflicts: state.conflicts,
      }),
    }
  )
);
