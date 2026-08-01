import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getDayAbbr(day: string): string {
  const abbrs: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  };
  return abbrs[day] || day.slice(0, 3);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DESIGNATIONS = [
  'Professor', 'Associate Professor', 'Assistant Professor',
  'Lecturer', 'Senior Lecturer', 'HOD', 'Dean',
];

export const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Electrical', 'MBA', 'MCA', 'Physics', 'Mathematics',
];

export const ROOM_TYPES = {
  classroom: { label: 'Classroom', color: 'blue' },
  lab: { label: 'Laboratory', color: 'green' },
  seminar_hall: { label: 'Seminar Hall', color: 'purple' },
};

export const SUBJECT_TYPES = {
  theory: { label: 'Theory', color: '#3B82F6', bgClass: 'tt-cell-theory', badgeClass: 'badge-theory' },
  lab: { label: 'Lab', color: '#22C55E', bgClass: 'tt-cell-lab', badgeClass: 'badge-lab' },
  seminar: { label: 'Seminar', color: '#A855F7', bgClass: 'tt-cell-leave', badgeClass: 'badge-leave' },
};

export const STATUS_COLORS = {
  active: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
  'on-leave': 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  available: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  maintenance: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  occupied: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
};
