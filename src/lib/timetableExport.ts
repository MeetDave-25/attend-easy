import { Classroom, Faculty, Semester, Subject, TimetableEntry } from '@/types';

const escapeCsv = (value: string | number) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function downloadTimetableCsv(
  entries: TimetableEntry[],
  subjects: Subject[],
  faculty: Faculty[],
  classrooms: Classroom[],
  semesters: Semester[],
  filename = 'timetable.csv'
) {
  const rows = entries
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime))
    .map(entry => {
      const semester = semesters.find(item => item.id === entry.semesterId);
      const division = semester?.divisions.find(item => item.id === entry.divisionId);
      return [
        entry.day,
        `${entry.startTime}-${entry.endTime}`,
        semester ? `Semester ${semester.number}` : entry.semesterId,
        division?.name || entry.divisionId,
        subjects.find(item => item.id === entry.subjectId)?.name || entry.subjectId,
        faculty.find(item => item.id === entry.facultyId)?.name || entry.facultyId,
        classrooms.find(item => item.id === entry.classroomId)?.roomNumber || entry.classroomId,
      ];
    });

  const csv = [
    ['Day', 'Time', 'Semester', 'Division', 'Subject', 'Faculty', 'Classroom'],
    ...rows,
  ].map(row => row.map(escapeCsv).join(',')).join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
