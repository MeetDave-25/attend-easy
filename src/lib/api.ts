import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Classroom, CollegeConfig, Faculty, Semester, Subject, TimeSlot, TimetableEntry } from '@/types';

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
// Accept either the Render origin or the full API base URL from Vercel.
const API_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    message?: string;
    count?: number;
}

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    (error: AxiosError) => {
        console.error('API Error:', error);

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        if (error.response) {
            const errData = error.response.data as any;
            throw new Error(errData?.error?.message || 'Server error occurred');
        } else if (error.request) {
            throw new Error('No response from server. Please check if the backend is running.');
        } else {
            throw new Error(error.message || 'An unexpected error occurred');
        }
    }
);

// Authentication API
export const authAPI = {
    login: async (email: string, password: string) => {
        const response = await api.post<unknown, ApiEnvelope<{
            token: string;
            user: {
                id: string;
                name: string;
                email: string;
                role: 'hod' | 'faculty' | 'student';
                facultyId?: string;
                studentId?: string;
                avatar?: string;
            };
        }>>('/auth/login', { email, password });

        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    verify: async () => {
        const response = await api.get<unknown, ApiEnvelope<{ user: unknown }>>('/auth/verify');
        return response.data;
    },
};

// Students API
export const studentsAPI = {
    getAll: async (year?: number) => {
        const params = year ? { year } : {};
        return api.get('/students', { params });
    },

    getById: async (id: string) => {
        return api.get(`/students/${id}`);
    },

    create: async (data: {
        name: string;
        rollNumber: string;
        year: number;
        email: string;
    }) => {
        return api.post('/students', data);
    },

    update: async (id: string, data: Partial<{
        name: string;
        rollNumber: string;
        year: number;
        email: string;
    }>) => {
        return api.put(`/students/${id}`, data);
    },

    delete: async (id: string) => {
        return api.delete(`/students/${id}`);
    },
};

// Subjects API
export const subjectsAPI = {
    getAll: async (filters?: { year?: number; semester?: number }) => {
        return api.get('/subjects', { params: filters });
    },

    getById: async (id: string) => {
        return api.get(`/subjects/${id}`);
    },

    create: async (data: {
        name: string;
        code: string;
        year: number;
        semester: number;
    }) => {
        return api.post('/subjects', data);
    },

    update: async (id: string, data: Partial<{
        name: string;
        code: string;
        year: number;
        semester: number;
    }>) => {
        return api.put(`/subjects/${id}`, data);
    },

    delete: async (id: string) => {
        return api.delete(`/subjects/${id}`);
    },
};

// Attendance API
export const attendanceAPI = {
    createSession: async (data: {
        subjectId: string;
        qrCode: string;
        startTime: string;
        endTime: string;
        locationLat?: number;
        locationLng?: number;
        allowedRadius?: number;
    }) => {
        return api.post('/attendance/sessions', data);
    },

    getSessions: async (filters?: { subjectId?: string; isActive?: boolean }) => {
        return api.get('/attendance/sessions', { params: filters });
    },

    getSessionById: async (id: string) => {
        return api.get(`/attendance/sessions/${id}`);
    },

    markAttendance: async (data: {
        sessionId: string;
        studentId: string;
        locationLat?: number;
        locationLng?: number;
        locationAccuracy?: number;
    }) => {
        return api.post('/attendance/mark', data);
    },

    getStudentAttendance: async (studentId: string, subjectId?: string) => {
        const params = subjectId ? { subjectId } : {};
        return api.get(`/attendance/student/${studentId}`, { params });
    },

    stopSession: async (id: string) => {
        return api.patch(`/attendance/sessions/${id}/stop`);
    },
};

// Marks API
export const marksAPI = {
    getAll: async (filters?: {
        studentId?: string;
        subjectId?: string;
        testName?: string;
    }) => {
        return api.get('/marks', { params: filters });
    },

    create: async (data: {
        studentId: string;
        subjectId: string;
        testName: string;
        maxMarks: number;
        obtainedMarks: number;
        testDate?: string;
    }) => {
        return api.post('/marks', data);
    },

    update: async (id: string, data: Partial<{
        obtainedMarks: number;
        maxMarks: number;
        testName: string;
    }>) => {
        return api.put(`/marks/${id}`, data);
    },

    delete: async (id: string) => {
        return api.delete(`/marks/${id}`);
    },

    getStudentSummary: async (studentId: string) => {
        return api.get(`/marks/student/${studentId}/summary`);
    },
};

// Shared college workspace synchronization. This keeps master data and the
// generated timetable in the server database instead of only in one browser.
export const syncAPI = {
    getState: async () => {
        const response = await api.get<unknown, ApiEnvelope<{
            faculty: Faculty[];
            subjects: Subject[];
            classrooms: Classroom[];
            semesters: Semester[];
            timeSlots: TimeSlot[];
            timetableEntries: TimetableEntry[];
            collegeConfig: CollegeConfig | null;
        }>>('/sync');
        return response.data;
    },

    saveState: async (state: {
        faculty: Faculty[];
        subjects: Subject[];
        classrooms: Classroom[];
        semesters: Semester[];
        timeSlots: TimeSlot[];
        timetableEntries: TimetableEntry[];
        collegeConfig: CollegeConfig;
    }) => {
        const response = await api.post<unknown, ApiEnvelope<null>>('/sync', state);
        return response.data;
    },
};

// Health check
export const healthCheck = async () => {
    const healthUrl = API_URL.replace(/\/api\/?$/, '');
    return api.get('/health', { baseURL: healthUrl });
};

export default api;
