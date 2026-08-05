import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Faculty, Subject } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ChevronDown, ChevronUp, Edit2, Check, X,
  AlertTriangle, CheckCircle2, Crown, UserCheck, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WorkloadPanelProps {
  /** If true, shows a compact summary bar instead of full panel */
  compact?: boolean;
}

const WorkloadPanel = ({ compact = false }: WorkloadPanelProps) => {
  const { faculty, subjects, updateFaculty } = useTimetableStore();
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const activeFaculty = faculty.filter(f => f.status === "active");

  /** Compute how many lectures per week this faculty is expected to teach
   *  based on subjects assigned to them (subject.facultyId === f.id) */
  const getFacultyRequiredLoad = (f: Faculty) => {
    return subjects
      .filter(s => s.facultyId === f.id)
      .reduce((sum, s) => sum + (s.lectureCountPerWeek || 0), 0);
  };

  /** Get subjects assigned to a faculty */
  const getFacultySubjects = (f: Faculty): Subject[] => {
    return subjects.filter(s => s.facultyId === f.id);
  };

  const startEdit = (f: Faculty) => {
    setEditingId(f.id);
    setEditValue(f.weeklyLoad || 0);
  };

  const saveEdit = (f: Faculty) => {
    updateFaculty(f.id, { weeklyLoad: editValue });
    setEditingId(null);
    toast.success(`${f.name}'s weekly limit updated to ${editValue} lectures`);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Summary stats for compact mode
  const totalRequired = activeFaculty.reduce((sum, f) => sum + getFacultyRequiredLoad(f), 0);
  const overloadedCount = activeFaculty.filter(f => {
    const required = getFacultyRequiredLoad(f);
    return f.weeklyLoad > 0 && required > f.weeklyLoad;
  }).length;
  const unassignedSubjects = subjects.filter(s => !s.facultyId).length;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium">{activeFaculty.length} active</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60">
          <span className="font-medium">{totalRequired} total lectures/week</span>
        </div>
        {overloadedCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-medium">{overloadedCount} over limit</span>
          </div>
        )}
        {unassignedSubjects > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-medium">{unassignedSubjects} unassigned subjects</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">Faculty Workload Preview</h3>
            <p className="text-xs text-muted-foreground">
              Review lecture distribution before generating
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overloadedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {overloadedCount} over limit
            </span>
          )}
          {unassignedSubjects > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {unassignedSubjects} unassigned
            </span>
          )}
          {overloadedCount === 0 && unassignedSubjects === 0 && activeFaculty.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pb-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-blue-500" />
                  <span>Permanent — soft weekly limit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3 text-purple-500" />
                  <span>Visiting — hard weekly limit (exact)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-primary" />
                  <span>Click pencil icon to edit limit</span>
                </div>
              </div>

              {activeFaculty.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active faculty found. Add faculty members first.
                </p>
              ) : (
                activeFaculty.map(f => {
                  const required = getFacultyRequiredLoad(f);
                  const limit = f.weeklyLoad || 0;
                  const isOverLimit = limit > 0 && required > limit;
                  const isAtLimit = limit > 0 && required === limit;
                  const percentage = limit > 0 ? Math.min(100, Math.round((required / limit) * 100)) : 0;
                  const isVisiting = f.type === "visiting";
                  const fSubjects = getFacultySubjects(f);
                  const isEditing = editingId === f.id;

                  return (
                    <div
                      key={f.id}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        isOverLimit
                          ? "border-amber-500/30 bg-amber-500/5"
                          : isAtLimit
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Faculty type icon */}
                        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isVisiting ? "bg-purple-500/10" : "bg-blue-500/10"
                        }`}>
                          {isVisiting
                            ? <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                            : <Crown className="w-3.5 h-3.5 text-blue-500" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{f.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isVisiting
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}>
                              {isVisiting ? "Visiting" : "Permanent"}
                            </span>
                          </div>

                          {/* Subjects taught */}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {fSubjects.length > 0 ? (
                              fSubjects.map(s => (
                                <span key={s.id} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                  {s.code || s.name} ({s.lectureCountPerWeek}/wk)
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No subjects assigned</span>
                            )}
                          </div>

                          {/* Load bar */}
                          <div className="mt-2.5 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {required} lectures needed
                                {limit > 0 && ` / ${limit} limit`}
                              </span>
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">Weekly limit:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={editValue}
                                    onChange={e => setEditValue(Number(e.target.value))}
                                    className="w-14 h-6 text-xs text-center rounded border border-border bg-background px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === "Enter") saveEdit(f);
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                  />
                                  <button
                                    onClick={() => saveEdit(f)}
                                    className="w-5 h-5 rounded bg-green-500/15 text-green-600 hover:bg-green-500/25 flex items-center justify-center transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="w-5 h-5 rounded bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {isOverLimit && (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">
                                      ⚠ {required - limit} over {isVisiting ? "(will be blocked)" : "(soft — allowed)"}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => startEdit(f)}
                                    className="w-5 h-5 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                                    title="Edit weekly limit"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {limit > 0 && (
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isOverLimit
                                      ? "bg-amber-500"
                                      : percentage > 80
                                      ? "bg-green-500"
                                      : "bg-primary"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Unassigned subjects warning */}
              {unassignedSubjects > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {unassignedSubjects} subject{unassignedSubjects > 1 ? "s" : ""} without an assigned faculty
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The generator will try any eligible active faculty for these subjects. For best results, assign a specific faculty to each subject.
                    </p>
                  </div>
                </div>
              )}

              {/* Total summary */}
              <div className="flex items-center justify-between pt-2 border-t border-border text-sm text-muted-foreground">
                <span>Total lectures needed/week: <strong className="text-foreground">{totalRequired}</strong></span>
                <span>{activeFaculty.length} active faculty</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkloadPanel;
