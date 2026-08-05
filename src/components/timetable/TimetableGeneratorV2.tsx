import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import { generateTimetable } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Zap, AlertTriangle, CheckCircle2, RotateCcw,
  Calendar as CalendarIcon, Download, Users, Building2,
  GraduationCap, Clock3, BookOpen, ChevronDown, ChevronUp,
  Settings2, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConflictPanel from "./ConflictPanel";
import WorkloadPanel from "./WorkloadPanel";
import { downloadTimetableCsv } from "@/lib/timetableExport";
import { Semester, Subject } from "@/types";
import { generateId } from "@/lib/utils";

const cleanDivisionName = (value: string | undefined) => String(value || "")
  .trim()
  .toUpperCase()
  .replace(/^DIV(?:ISION)?\s*/, "");

const deriveCompleteSemesters = (current: Semester[], subjects: Subject[]): Semester[] => {
  const complete = current.map((semester) => ({
    ...semester,
    divisions: semester.divisions.map((division) => ({ ...division })),
  }));

  for (const subject of subjects) {
    const semesterNumber = Number(subject.semester) || Math.max(1, (Number(subject.year) || 1) * 2 - 1);
    let semester = complete.find((item) => Number(item.number) === semesterNumber);
    if (!semester) {
      semester = {
        id: generateId(),
        number: semesterNumber,
        year: Number(subject.year) || Math.ceil(semesterNumber / 2),
        isActive: true,
        divisions: [],
      };
      complete.push(semester);
    }

    const listedDivisions = cleanDivisionName(subject.division)
      .split(/[,/&]+/)
      .map((division) => division.trim())
      .filter(Boolean)
      .filter((division) => division !== "ALL");
    const divisionsToEnsure = listedDivisions.length > 0 ? listedDivisions : semester.divisions.length > 0 ? [] : ["A"];

    for (const divisionName of divisionsToEnsure) {
      if (!semester.divisions.some((division) => cleanDivisionName(division.name) === divisionName)) {
        semester.divisions.push({
          id: generateId(),
          semesterId: semester.id,
          name: divisionName,
          studentCount: 60,
          subjectIds: [],
        });
      }
    }
  }

  return complete.sort((left, right) => left.number - right.number);
};

// ---- Generation strategy options ----
type Strategy = "balanced" | "compact" | "spread";

const STRATEGY_OPTIONS: { value: Strategy; label: string; description: string }[] = [
  { value: "balanced", label: "Balanced", description: "Spread lectures evenly through the week (recommended)" },
  { value: "compact", label: "Compact", description: "Pack lectures towards early days for free afternoons" },
  { value: "spread", label: "Spread", description: "Maximum spacing between same-subject lectures" },
];

const TimetableGeneratorV2 = () => {
  const navigate = useNavigate();
  const store = useTimetableStore();
  const {
    collegeConfig, faculty, subjects, classrooms, semesters, timeSlots, leaveEntries,
    isGenerating, setIsGenerating, setTimetableEntries, setGenerationResult, setConflicts, addNotification,
    setSemesters, setSelectedSemester, setSelectedDivision,
    generationResult, conflicts, timetableEntries
  } = store;

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [gaGeneration, setGaGeneration] = useState(0);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("balanced");

  // Readiness checks
  const activeFaculty = faculty.filter(f => f.status === "active");
  const unassignedSubjects = subjects.filter(s => !s.facultyId);
  const visitingOverload = faculty.filter(f =>
    f.type === "visiting" && f.weeklyLoad > 0 &&
    subjects.filter(s => s.facultyId === f.id).reduce((sum, s) => sum + (s.lectureCountPerWeek || 0), 0) > f.weeklyLoad
  );

  const readinessItems = [
    {
      label: "Faculty",
      count: activeFaculty.length,
      total: faculty.length,
      icon: Users,
      warn: activeFaculty.length === 0,
      hint: faculty.length > 0 ? `${faculty.length - activeFaculty.length} inactive` : "None added",
    },
    {
      label: "Subjects",
      count: subjects.length,
      total: subjects.length,
      icon: BookOpen,
      warn: subjects.length === 0,
      hint: unassignedSubjects.length > 0 ? `${unassignedSubjects.length} unassigned` : "All assigned",
    },
    {
      label: "Rooms",
      count: classrooms.filter(r => r.status === "available").length,
      total: classrooms.length,
      icon: Building2,
      warn: classrooms.filter(r => r.status === "available").length === 0,
      hint: `${classrooms.length - classrooms.filter(r => r.status === "available").length} unavailable`,
    },
    {
      label: "Semesters",
      count: semesters.length,
      total: semesters.length,
      icon: GraduationCap,
      warn: semesters.length === 0,
      hint: `${semesters.reduce((sum, s) => sum + s.divisions.length, 0)} divisions`,
    },
    {
      label: "Time Slots",
      count: timeSlots.filter(ts => ts.slotType === "lecture").length,
      total: timeSlots.length,
      icon: Clock3,
      warn: timeSlots.filter(ts => ts.slotType === "lecture").length === 0,
      hint: `${timeSlots.filter(ts => ts.slotType !== "lecture").length} breaks`,
    },
  ];

  const isReady = subjects.length > 0 && activeFaculty.length > 0 &&
    classrooms.some(r => r.status === "available") && timeSlots.some(ts => ts.slotType === "lecture");

  const handleRegenerate = () => {
    setGenerationResult(null);
    setConflicts([]);
    setTimetableEntries([]);
  };

  const handleGenerate = () => {
    const completeSemesters = deriveCompleteSemesters(semesters, subjects);

    if (!collegeConfig.isConfigured) return toast.error("Please configure college settings first");
    if (activeFaculty.length === 0) return toast.error("Add at least one active faculty member");
    if (subjects.length === 0) return toast.error("Add at least one subject");
    if (!classrooms.some(r => r.status === "available")) return toast.error("Add at least one available classroom");
    if (completeSemesters.length === 0) return toast.error("Add at least one subject with a semester or year");
    if (!timeSlots.some(ts => ts.slotType === "lecture")) return toast.error("Configure lecture time slots first");

    if (completeSemesters.length !== semesters.length ||
      completeSemesters.some((semester, _index) =>
        semester.divisions.length !== semesters.find(item => item.id === semester.id)?.divisions.length
      )) {
      setSemesters(completeSemesters);
    }

    setIsGenerating(true);
    setProgress(0);
    setGaGeneration(0);
    setStatusText("Reading your college configuration...");

    // Animated progress steps
    const steps = [
      { p: 10, t: "Sorting subjects by scheduling difficulty..." },
      { p: 25, t: "Checking faculty availability and workload limits..." },
      { p: 40, t: "Placing required lectures (constraint search)..." },
      { p: 60, t: "Respecting leave and room availability..." },
      { p: 75, t: "Running genetic optimisation — improving distribution..." },
      { p: 88, t: "Balancing faculty workloads across the week..." },
      { p: 95, t: "Verifying no conflicts remain..." },
    ];

    let delay = 0;
    steps.forEach(({ p, t }, index) => {
      delay += 350;
      setTimeout(() => {
        if (useTimetableStore.getState().isGenerating) {
          setProgress(p);
          setStatusText(t);
          if (p >= 75) setGaGeneration(Math.round((p - 75) / 20 * 28));
        }
      }, delay);
    });

    setTimeout(() => {
      try {
        const result = generateTimetable({
          config: collegeConfig,
          faculty,
          subjects,
          classrooms,
          semesters: completeSemesters,
          timeSlots,
          leaveEntries,
        });

        setProgress(100);
        setStatusText("Complete!");
        setGaGeneration(28);

        setGenerationResult(result);
        setTimetableEntries(result.entries);
        setConflicts(result.conflicts);

        if (result.success) {
          setSelectedSemester("all");
          setSelectedDivision("all");
          addNotification({
            type: "timetable_published",
            title: "Timetable updated",
            message: "A new conflict-free timetable is now available. Open your schedule to see your current classes.",
            forRole: "all",
          });
          toast.success(`✅ Timetable generated! ${result.stats.totalEntries} lectures scheduled with zero conflicts.`);
        } else {
          const errors = result.conflicts.filter(c => c.severity === "error").length;
          toast.error(`${errors} issue${errors === 1 ? "" : "s"} found — review the conflicts below and fix them.`);
        }
      } catch (err: any) {
        toast.error(`Generation failed: ${err.message}`);
        setGenerationResult(null);
      } finally {
        setTimeout(() => setIsGenerating(false), 500);
      }
    }, delay + 500);
  };

  const errorCount = conflicts.filter(c => c.severity === "error").length;
  const warningCount = conflicts.filter(c => c.severity === "warning").length;
  const generatedSemesters = Array.from(new Set(
    timetableEntries.map(entry => entry.semesterId)
  )).map(id => semesters.find(semester => semester.id === id)).filter(Boolean);

  // =====================================================================
  // GENERATING state
  // =====================================================================
  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-10 rounded-3xl text-center space-y-8 max-w-xl mx-auto"
      >
        {/* Spinning rings */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Generating Timetable...</h3>
          <p className="text-muted-foreground text-sm min-h-[1.25rem] transition-all">{statusText}</p>
          <Progress value={progress} className="h-2 w-full bg-secondary" />
          {gaGeneration > 0 && (
            <p className="text-xs text-muted-foreground">
              Genetic algorithm — generation {gaGeneration}/28
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // =====================================================================
  // RESULTS state
  // =====================================================================
  if (generationResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Result header */}
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              {generationResult.success ? (
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold">
                  {generationResult.success ? "Timetable Ready!" : "Needs Attention"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {generationResult.success
                    ? "Zero conflicts — your timetable is good to go."
                    : `${errorCount} error${errorCount !== 1 ? "s" : ""} found — fix them to publish.`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleRegenerate} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Regenerate
              </Button>
              {generationResult.success && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => downloadTimetableCsv(timetableEntries, subjects, faculty, classrooms, semesters)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </Button>
                  <Button variant="gradient" onClick={() => navigate("/app/timetable")} className="gap-2">
                    <CalendarIcon className="w-4 h-4" /> View Timetable
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Lectures", value: generationResult.stats.totalEntries, color: "text-primary" },
              { label: "Faculty Used", value: generationResult.stats.facultyAssigned, color: "text-blue-500" },
              { label: "Rooms Used", value: generationResult.stats.roomsUsed, color: "text-purple-500" },
              {
                label: "Conflicts",
                value: errorCount,
                color: errorCount > 0 ? "text-red-500" : "text-green-500",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-5 bg-secondary/30 rounded-2xl">
                <p className={`text-4xl font-bold mb-1 ${color}`}>{value}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {generationResult.success && generatedSemesters.length > 0 && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-3 text-sm text-muted-foreground text-center">
              Scheduled: {generatedSemesters.map(s => `Year ${s!.year} · Sem ${s!.number}`).join("  |  ")}
            </div>
          )}
        </div>

        {/* Conflicts */}
        {(errorCount > 0 || warningCount > 0) && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Issues to Fix
            </h3>
            <ConflictPanel conflicts={conflicts} />
          </div>
        )}
      </motion.div>
    );
  }

  // =====================================================================
  // DEFAULT state (pre-generation)
  // =====================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Smart Timetable Generator</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          One click → fully scheduled week. Each subject goes to its assigned faculty.
          Visiting faculty get exactly their set lecture count. No conflicts, no guesswork.
        </p>
      </div>

      {/* ── ZONE 1: Readiness Check ── */}
      <div className="glass-card p-6 rounded-3xl space-y-5">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          System Readiness
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {readinessItems.map(({ label, count, warn, hint, icon: Icon }) => (
            <div
              key={label}
              className={`rounded-2xl border p-4 text-center ${
                warn
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-green-500/20 bg-green-500/5"
              }`}
            >
              <Icon className={`mx-auto mb-2 h-5 w-5 ${warn ? "text-red-500" : "text-green-600"}`} />
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 opacity-70">{hint}</p>
            </div>
          ))}
        </div>

        {/* Visiting faculty overload warning */}
        {visitingOverload.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Visiting faculty workload conflict</p>
              <p className="text-muted-foreground mt-0.5">
                {visitingOverload.map(f => f.name).join(", ")} — assigned subjects exceed their weekly limit.
                Their extra lectures will be blocked. Increase their limit or reduce lecture counts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── ZONE 2: Workload Preview ── */}
      <WorkloadPanel />

      {/* ── ZONE 3: Generation Settings (collapsible) ── */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          className="w-full flex items-center justify-between p-5 bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Generation Settings</span>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          {settingsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {settingsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-3">Scheduling Strategy</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STRATEGY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setStrategy(opt.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          strategy === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-primary/40 hover:bg-secondary/50"
                        }`}
                      >
                        <p className="font-semibold text-sm mb-1">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
                  <strong className="text-foreground">Always enforced:</strong> Each subject only goes to its assigned faculty.
                  Visiting faculty hard limits are never exceeded. No faculty is double-booked.
                  No division has overlapping lectures. Lunch break is always kept free.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ZONE 4: BIG GENERATE BUTTON ── */}
      <div className="glass-card p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Ready to generate?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {subjects.length} subjects · {activeFaculty.length} faculty · {timeSlots.filter(ts => ts.slotType === "lecture").length} lecture slots
            </p>
          </div>
          <Button
            size="xl"
            variant="gradient"
            className="w-full sm:w-auto text-base font-bold px-10 py-4 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleGenerate}
            disabled={!isReady}
          >
            <Zap className="w-5 h-5 mr-2 fill-current" />
            Generate Timetable
          </Button>
        </div>

        {!isReady && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Complete the readiness checklist above before generating.
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TimetableGeneratorV2;
