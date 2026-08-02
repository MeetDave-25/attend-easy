import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { TimetableEntry, TimeSlot } from "@/types";
import { SUBJECT_TYPES } from "@/lib/utils";
import CellDetailModal from "./CellDetailModal";
import { formatTime } from "@/lib/utils";

interface TimetableGridProps {
  viewType: 'student' | 'faculty';
  filterId: string; // semId__divId for students, facultyId or all for faculty
  semesterFilterId?: string;
}

const TimetableGrid = ({ viewType, filterId, semesterFilterId = 'all' }: TimetableGridProps) => {
  const { timetableEntries, timeSlots, collegeConfig, subjects, faculty, classrooms, semesters } = useTimetableStore();
  const [selectedCell, setSelectedCell] = useState<TimetableEntry | null>(null);

  // Group and sort time slots
  const uniqueTimeSlots = Array.from(new Set(timeSlots.map(ts => `${ts.startTime}-${ts.endTime}`)))
    .map(timeStr => {
      const [start, end] = timeStr.split('-');
      const slotData = timeSlots.find(ts => ts.startTime === start && ts.endTime === end);
      return {
        id: timeStr,
        startTime: start,
        endTime: end,
        slotType: slotData?.slotType || 'lecture',
        order: slotData?.order || 0
      };
    })
    .sort((a, b) => a.order - b.order || a.startTime.localeCompare(b.startTime));

  // Filter entries based on view type
  let filteredEntries = semesterFilterId !== 'all'
    ? timetableEntries.filter(entry => entry.semesterId === semesterFilterId)
    : timetableEntries;
  if (viewType === 'student' && filterId && filterId.includes('__')) {
    const [semId, divId] = filterId.split('__');
    filteredEntries = filteredEntries.filter(e => e.semesterId === semId && (divId === 'all' || e.divisionId === divId));
  } else if (viewType === 'faculty' && filterId !== 'all') {
    filteredEntries = filteredEntries.filter(e => e.facultyId === filterId);
  }

  // Generate grid cells
  const getCellForSlotAndDay = (day: string, startTime: string, endTime: string) => {
    // If it's a lunch/break slot, return empty (styled differently later)
    const timeSlotObj = timeSlots.find(ts => ts.day === day && ts.startTime === startTime && ts.endTime === endTime);
    if (timeSlotObj && (timeSlotObj.slotType === 'lunch' || timeSlotObj.slotType === 'break')) {
      return { type: 'break', slot: timeSlotObj };
    }

    // Find entries that match the time exactly
    const entries = filteredEntries.filter(e => e.day === day && e.startTime === startTime && e.endTime === endTime);
    
    if (entries.length === 0) return null;
    return { type: 'lecture', entries };
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="timetable-grid min-w-max">
          <thead>
            <tr>
              <th className="timetable-header-cell border-b border-border w-24">Time</th>
              {collegeConfig.workingDays.map(day => (
                <th key={day} className="timetable-header-cell border-l border-b border-border">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimeSlots.map(slot => {
              const isBreak = slot.slotType === 'lunch' || slot.slotType === 'break';
              
              return (
                <tr key={slot.id} className="border-b border-border last:border-b-0 group">
                  <td className="timetable-time-cell whitespace-nowrap group-hover:bg-muted/60 transition-colors">
                    {formatTime(slot.startTime)}<br />
                    <span className="opacity-50">-</span><br />
                    {formatTime(slot.endTime)}
                  </td>
                  
                  {collegeConfig.workingDays.map(day => {
                    const cellData = getCellForSlotAndDay(day, slot.startTime, slot.endTime);
                    
                    if (cellData?.type === 'break' || (isBreak && !cellData)) {
                      return (
                        <td key={`${day}-${slot.id}`} className="border-l border-border bg-muted/20 text-center relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-xs font-bold uppercase tracking-widest pointer-events-none transform -rotate-12">
                            {slot.slotType === 'lunch' ? 'Lunch Break' : 'Short Break'}
                          </div>
                        </td>
                      );
                    }

                    if (!cellData || !cellData.entries || cellData.entries.length === 0) {
                      return <td key={`${day}-${slot.id}`} className="border-l border-border tt-cell-empty"></td>;
                    }

                    // Display the first entry (or multiple if conflict)
                    return (
                      <td key={`${day}-${slot.id}`} className="border-l border-border p-1.5 align-top">
                        <div className="flex flex-col gap-1.5 h-full">
                          {cellData.entries.map((entry, idx) => {
                            const subject = subjects.find(s => s.id === entry.subjectId);
                            const fac = faculty.find(f => f.id === entry.facultyId);
                            const room = classrooms.find(r => r.id === entry.classroomId);
                            const semester = semesters.find(s => s.id === entry.semesterId);
                            const division = semester?.divisions.find(d => d.id === entry.divisionId);
                            
                            const typeConfig = subject ? SUBJECT_TYPES[subject.type as keyof typeof SUBJECT_TYPES] : SUBJECT_TYPES.theory;
                            // Several lectures in one cell are normal in the
                            // faculty/admin overview because different classes
                            // can run at the same time.
                            const isConflict = viewType === 'student' && cellData.entries.length > 1;

                            return (
                              <div 
                                key={entry.id}
                                onClick={() => setSelectedCell(entry)}
                                className={`
                                  relative p-2 rounded-lg text-sm transition-all duration-200 cursor-pointer h-full border border-transparent shadow-sm hover:shadow-md hover:-translate-y-0.5
                                  ${isConflict ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : typeConfig?.bgClass}
                                `}
                              >
                                {isConflict && (
                                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Conflict Detected" />
                                )}
                                
                                <p className="font-bold leading-tight mb-1">{subject?.name || 'Unknown'}</p>
                                {viewType === 'faculty' ? (
                                  <div className="text-xs opacity-90 space-y-0.5 font-medium">
                                    <p>{fac?.name || 'No Faculty'}</p>
                                    <p>Year {semester?.year || '-'} · Sem {semester?.number || '-'} · Div {division?.name || '-'}</p>
                                    <p>Room {room?.roomNumber || 'Unassigned'}</p>
                                  </div>
                                ) : (
                                  <div className="text-xs opacity-90 font-semibold">
                                    <p className="text-sm">Room {room?.roomNumber || 'Unassigned'}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCell && (
        <CellDetailModal 
          entry={selectedCell} 
          isOpen={!!selectedCell} 
          onClose={() => setSelectedCell(null)} 
        />
      )}
    </>
  );
};

export default TimetableGrid;
