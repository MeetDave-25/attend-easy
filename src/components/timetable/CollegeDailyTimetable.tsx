import { useMemo, useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { TimetableEntry } from "@/types";
import { formatTime } from "@/lib/utils";
import CellDetailModal from "./CellDetailModal";

interface CollegeDailyTimetableProps {
  viewType: "student" | "faculty";
  semesterId: string;
  day: string;
  divisionFilterId?: string;
  facultyFilterId?: string;
}

const CollegeDailyTimetable = ({
  viewType,
  semesterId,
  day,
  divisionFilterId = "all",
  facultyFilterId = "all",
}: CollegeDailyTimetableProps) => {
  const { timetableEntries, timeSlots, semesters, subjects, faculty, classrooms } = useTimetableStore();
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  const semester = semesters.find((item) => item.id === semesterId);
  const divisions = useMemo(() => {
    if (!semester) return [];
    return divisionFilterId === "all"
      ? semester.divisions
      : semester.divisions.filter((division) => division.id === divisionFilterId);
  }, [semester, divisionFilterId]);

  const slots = useMemo(() => timeSlots
    .filter((slot) => slot.day === day)
    .sort((left, right) => left.order - right.order || left.startTime.localeCompare(right.startTime)), [timeSlots, day]);

  const entriesForDay = useMemo(() => timetableEntries.filter((entry) =>
    entry.semesterId === semesterId &&
    entry.day === day &&
    (facultyFilterId === "all" || entry.facultyId === facultyFilterId)
  ), [timetableEntries, semesterId, day, facultyFilterId]);

  if (!semester || divisions.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">No divisions are available for this timetable.</div>;
  }

  const getEntry = (slotId: string, divisionId: string) =>
    entriesForDay.find((entry) => entry.timeSlotId === slotId && entry.divisionId === divisionId);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-secondary/40">
              <th rowSpan={2} className="min-w-32 border border-border px-3 py-3 text-center font-bold">Lecture / Time</th>
              <th colSpan={divisions.length} className="border border-border px-3 py-3 text-center text-base font-bold">
                Year {semester.year} · Semester {semester.number}
              </th>
            </tr>
            <tr className="bg-secondary/25">
              {divisions.map((division) => (
                <th key={division.id} className="min-w-44 border border-border px-3 py-2 text-center font-semibold">
                  Division {division.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const isBreak = slot.slotType === "break" || slot.slotType === "lunch";
              return (
                <tr key={slot.id}>
                  <td className="border border-border bg-muted/20 px-3 py-4 text-center font-semibold whitespace-nowrap">
                    {formatTime(slot.startTime)}<br />
                    <span className="text-xs text-muted-foreground">to</span><br />
                    {formatTime(slot.endTime)}
                  </td>
                  {isBreak ? (
                    <td colSpan={divisions.length} className="border border-border bg-muted/40 px-3 py-4 text-center font-bold tracking-widest text-muted-foreground uppercase">
                      {slot.slotType === "lunch" ? "Lunch Break" : "Break"}
                    </td>
                  ) : divisions.map((division) => {
                    const entry = getEntry(slot.id, division.id);
                    if (!entry) return <td key={division.id} className="h-24 border border-border bg-background" />;

                    const subject = subjects.find((item) => item.id === entry.subjectId);
                    const teacher = faculty.find((item) => item.id === entry.facultyId);
                    const room = classrooms.find((item) => item.id === entry.classroomId);
                    return (
                      <td key={division.id} className="h-24 border border-border p-2 align-middle">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="h-full w-full rounded-lg p-2 text-center transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          {viewType === "student" ? (
                            <span className="text-base font-semibold">Room No. {room?.roomNumber || "—"}</span>
                          ) : (
                            <span className="block space-y-1">
                              <span className="block font-bold leading-tight">{subject?.name || "Subject"}</span>
                              <span className="block text-xs text-muted-foreground">{teacher?.name || "Teacher not assigned"}</span>
                              <span className="block text-xs text-muted-foreground">Room No. {room?.roomNumber || "—"}</span>
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <CellDetailModal entry={selectedEntry} isOpen onClose={() => setSelectedEntry(null)} />
      )}
    </>
  );
};

export default CollegeDailyTimetable;
