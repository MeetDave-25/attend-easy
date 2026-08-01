import { useTimetableStore } from "@/store/timetableStore";
import { TimetableEntry } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SUBJECT_TYPES, formatTime } from "@/lib/utils";
import { BookOpen, Users, Building2, Clock, Calendar, GraduationCap } from "lucide-react";

interface CellDetailModalProps {
  entry: TimetableEntry;
  isOpen: boolean;
  onClose: () => void;
}

const CellDetailModal = ({ entry, isOpen, onClose }: CellDetailModalProps) => {
  const { subjects, faculty, classrooms, semesters } = useTimetableStore();

  const subject = subjects.find(s => s.id === entry.subjectId);
  const fac = faculty.find(f => f.id === entry.facultyId);
  const room = classrooms.find(r => r.id === entry.classroomId);
  const sem = semesters.find(s => s.id === entry.semesterId);
  const div = sem?.divisions.find(d => d.id === entry.divisionId);

  if (!subject) return null;
  const typeConfig = SUBJECT_TYPES[subject.type as keyof typeof SUBJECT_TYPES];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">Lecture Details</span>
            <Badge variant={subject.type as any}>{typeConfig?.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Subject Block */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border">
            <div className={`p-3 rounded-xl ${typeConfig?.bgClass || 'bg-blue-100 text-blue-500'}`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-none mb-1">{subject.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">{subject.code}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Time */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" /> Time
              </div>
              <p className="font-semibold text-sm">
                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
              </p>
              <p className="text-xs text-muted-foreground">{entry.day}</p>
            </div>

            {/* Room */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building2 className="w-4 h-4" /> Classroom
              </div>
              <p className="font-semibold text-sm">{room?.roomNumber || 'Unassigned'}</p>
              <p className="text-xs text-muted-foreground capitalize">{room?.roomType.replace('_', ' ')}</p>
            </div>

            {/* Faculty */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="w-4 h-4" /> Faculty
              </div>
              <p className="font-semibold text-sm">{fac?.name || 'Unassigned'}</p>
              <p className="text-xs text-muted-foreground">{fac?.department}</p>
            </div>

            {/* Students */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <GraduationCap className="w-4 h-4" /> Target Class
              </div>
              <p className="font-semibold text-sm">Sem {sem?.number} - Div {div?.name}</p>
              <p className="text-xs text-muted-foreground">{div?.studentCount} students</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CellDetailModal;
