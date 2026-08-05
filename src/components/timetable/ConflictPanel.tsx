import { useNavigate } from "react-router-dom";
import { Conflict } from "@/types";
import {
  AlertTriangle, Info, XCircle, ArrowRight,
  UserX, DoorOpen, Users, BookX, Clock
} from "lucide-react";

interface ConflictPanelProps {
  conflicts: Conflict[];
}

/** Converts raw conflict types into a human-friendly icon and label */
const getConflictMeta = (conflict: Conflict) => {
  switch (conflict.type) {
    case "faculty_conflict":
      return { icon: UserX, label: "Double-booked Faculty", color: "red" };
    case "room_conflict":
      return { icon: DoorOpen, label: "Room Conflict", color: "red" };
    case "division_conflict":
      return { icon: Users, label: "Students Overlap", color: "red" };
    case "workload_conflict":
      return { icon: Clock, label: "Workload Exceeded", color: "amber" };
    case "validation_error":
      return { icon: BookX, label: "Setup Issue", color: conflict.severity === "error" ? "red" : "amber" };
    case "unavailable_faculty":
      return { icon: UserX, label: "Faculty Unavailable", color: "amber" };
    default:
      return { icon: AlertTriangle, label: "Issue", color: conflict.severity === "error" ? "red" : "amber" };
  }
};

/** Maps a navigate path to the right fix page */
const getFixAction = (conflict: Conflict): { label: string; path: string } | null => {
  switch (conflict.type) {
    case "faculty_conflict":
    case "unavailable_faculty":
      return { label: "Go to Faculty", path: "/app/faculty" };
    case "room_conflict":
      return { label: "Go to Rooms", path: "/app/classrooms" };
    case "workload_conflict":
      return { label: "Edit Faculty Load", path: "/app/faculty" };
    case "validation_error":
      if (conflict.description.toLowerCase().includes("faculty")) return { label: "Go to Subjects", path: "/app/subjects" };
      if (conflict.description.toLowerCase().includes("room") || conflict.description.toLowerCase().includes("classroom")) return { label: "Go to Rooms", path: "/app/classrooms" };
      if (conflict.description.toLowerCase().includes("slot")) return { label: "Go to Time Slots", path: "/app/timeslots" };
      return { label: "Go to Settings", path: "/app/settings" };
    default:
      return null;
  }
};

const ConflictPanel = ({ conflicts }: ConflictPanelProps) => {
  const navigate = useNavigate();
  if (conflicts.length === 0) return null;

  const errors = conflicts.filter(c => c.severity === "error");
  const warnings = conflicts.filter(c => c.severity === "warning");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap text-sm">
        {errors.length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            {errors.length} error{errors.length > 1 ? "s" : ""} — must fix
          </span>
        )}
        {warnings.length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Conflict cards */}
      {conflicts.map((conflict, index) => {
        const { icon: Icon, label, color } = getConflictMeta(conflict);
        const fixAction = getFixAction(conflict);
        const isError = conflict.severity === "error";

        return (
          <div
            key={conflict.id || index}
            className={`rounded-xl border p-4 space-y-3 ${
              isError
                ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isError ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"
              }`}>
                <Icon className={`w-4 h-4 ${isError ? "text-red-500" : "text-amber-500"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isError ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {label}
                  </span>
                  {isError && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-200/50 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-medium">
                      BLOCKS GENERATION
                    </span>
                  )}
                </div>

                {/* Human-readable description */}
                <p className="text-sm mt-1.5 text-foreground/90 leading-relaxed">{conflict.description}</p>

                {/* Suggestions */}
                {conflict.suggestions && conflict.suggestions.length > 0 && (
                  <div className="mt-3 bg-background/60 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-muted-foreground">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      How to fix:
                    </div>
                    <ul className="space-y-1">
                      {conflict.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick navigate button */}
                {fixAction && (
                  <button
                    onClick={() => navigate(fixAction.path)}
                    className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isError
                        ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300"
                        : "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {fixAction.label} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConflictPanel;
