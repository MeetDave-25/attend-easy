import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import { generateTimetable } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle2, RotateCcw, Calendar as CalendarIcon, Download, Users, Building2, GraduationCap, Clock3 } from "lucide-react";
import { motion } from "framer-motion";
import ConflictPanel from "./ConflictPanel";
import { downloadTimetableCsv } from "@/lib/timetableExport";
import { Semester, Subject } from "@/types";
import { generateId } from "@/lib/utils";

const cleanDivisionName = (value: string | undefined) => String(value || "")
  .trim()
  .toUpperCase()
  .replace(/^DIV(?:ISION)?\s*/, "");

// Imported college sheets often contain subjects for Year 2/3 before the
// corresponding semester/division records are added. Build those missing
// records automatically so one Generate click always includes every year.
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

const TimetableGeneratorV2 = () => {
  const navigate = useNavigate();
  const store = useTimetableStore();
  const { 
    collegeConfig, faculty, subjects, classrooms, semesters, timeSlots, leaveEntries,
    isGenerating, setIsGenerating, setTimetableEntries, setGenerationResult, setConflicts, addNotification,
    setSemesters,
    setSelectedSemester, setSelectedDivision,
    generationResult, conflicts, timetableEntries
  } = store;

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const readinessItems = [
    { label: "Faculty", count: faculty.length, icon: Users },
    { label: "Subjects", count: subjects.length, icon: CheckCircle2 },
    { label: "Rooms", count: classrooms.length, icon: Building2 },
    { label: "Semesters", count: semesters.length, icon: GraduationCap },
    { label: "Lecture slots", count: timeSlots.length, icon: Clock3 },
  ];
  const subjectsForReview = subjects;
  const subjectsForSemester = subjects;

  const handleRegenerate = () => {
    setGenerationResult(null);
    setConflicts([]);
    setTimetableEntries([]);
  };

  const handleGenerate = () => {
    const completeSemesters = deriveCompleteSemesters(semesters, subjects);
    // Validation
    if (!collegeConfig.isConfigured) return toast.error("Please configure college settings first");
    if (faculty.length === 0) return toast.error("Add at least one faculty member");
    if (subjects.length === 0) return toast.error("Add at least one subject");
    if (classrooms.length === 0) return toast.error("Add at least one classroom");
    if (completeSemesters.length === 0) return toast.error("Add at least one subject with a semester or year");
    if (timeSlots.length === 0) return toast.error("Configure time slots first");

    if (completeSemesters.length !== semesters.length || completeSemesters.some((semester, index) => semester.divisions.length !== semesters.find((item) => item.id === semester.id)?.divisions.length)) {
      setSemesters(completeSemesters);
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusText("Preparing your college rules...");

    // Simulate progress for UI feel
    const intervals = [
      { p: 20, t: "Reading subjects, rooms and teachers..." },
      { p: 40, t: "Placing every required class..." },
      { p: 60, t: "Respecting leave and room availability..." },
      { p: 80, t: "Checking for clashes..." },
      { p: 95, t: "Balancing the timetable with genetic optimisation..." }
    ];

    let delay = 0;
    intervals.forEach(({ p, t }, index) => {
      delay += 400;
      setTimeout(() => {
        if (useTimetableStore.getState().isGenerating) {
          setProgress(p);
          setStatusText(t);
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
        
        setGenerationResult(result);
        setTimetableEntries(result.entries);
        setConflicts(result.conflicts);
        
        if (result.success) {
          // Always open the timetable with every generated year visible.
          setSelectedSemester("all");
          setSelectedDivision("all");
          addNotification({
            type: "timetable_published",
            title: "Timetable updated",
            message: "A new conflict-free timetable is now available. Open your schedule to see your current classes.",
            forRole: "all",
          });
          toast.success("Timetable generated successfully with ZERO conflicts!");
        } else {
          const errors = result.conflicts.filter(c => c.severity === 'error').length;
          toast.error(`Timetable was not generated. Fix ${errors} issue${errors === 1 ? "" : "s"} and try again.`);
        }
      } catch (err: any) {
        toast.error(`Generation failed: ${err.message}`);
        setGenerationResult(null);
      } finally {
        setTimeout(() => setIsGenerating(false), 500);
      }
    }, delay + 600);
  };

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;
  const generatedSemesters = Array.from(new Set(
    timetableEntries.map(entry => entry.semesterId)
  )).map(id => semesters.find(semester => semester.id === id)).filter(Boolean);
  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight">Smart Generator</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          One-click, conflict-free timetable generation. The system covers every required class, then uses genetic optimisation to spread lectures naturally.
        </p>
      </div>

      {isGenerating ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 rounded-3xl text-center space-y-8 max-w-xl mx-auto"
        >
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Generating Timetable...</h3>
            <p className="text-muted-foreground">{statusText}</p>
            <Progress value={progress} className="h-2 w-full bg-secondary" />
          </div>
        </motion.div>
      ) : generationResult ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Results Summary */}
          <div className="glass-card p-8 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 md:col-span-3 border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                {generationResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                )}
                <h3 className="text-2xl font-bold">
                  {generationResult.success ? "Conflict-Free Timetable Ready" : "Generation Blocked"}
                </h3>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRegenerate} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Regenerate
                </Button>
                {generationResult.success && (
                  <>
                    <Button variant="outline" onClick={() => downloadTimetableCsv(timetableEntries, subjects, faculty, classrooms, semesters)} className="gap-2">
                      <Download className="w-4 h-4" /> Download CSV
                    </Button>
                    <Button variant="gradient" onClick={() => navigate("/app/timetable")} className="gap-2">
                      <CalendarIcon className="w-4 h-4" /> View Timetable
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="text-center p-6 bg-secondary/30 rounded-2xl">
              <p className="text-4xl font-bold mb-2">{generationResult.stats.totalEntries}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Lectures</p>
            </div>
            <div className="text-center p-6 bg-secondary/30 rounded-2xl">
              <p className="text-4xl font-bold mb-2">{generationResult.stats.roomsUsed}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rooms Utilized</p>
            </div>
            <div className="text-center p-6 bg-secondary/30 rounded-2xl">
              <p className={`text-4xl font-bold mb-2 ${errorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {errorCount}
              </p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Errors</p>
            </div>
            {generationResult.success && (
              <div className="col-span-1 md:col-span-3 rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 text-center text-sm text-muted-foreground">
                Generated together: {generatedSemesters.map(semester => `Year ${semester!.year} · Sem ${semester!.number}`).join("  |  ") || "all uploaded semesters"}.
              </div>
            )}
          </div>

          {/* Conflict Panel */}
          {(errorCount > 0 || warningCount > 0) && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Conflict Resolution Required</h3>
              <ConflictPanel conflicts={conflicts} />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">Generate complete timetable</h3>
                <p className="text-muted-foreground mt-1">
                  Upload the college data once and press Generate. The system chooses days, times, teachers and rooms automatically while keeping every required class covered.
                </p>
              </div>
              <span className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-semibold text-sm">{subjects.length} subjects loaded</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {readinessItems.map(({ label, count, icon: Icon }) => (
                <div key={label} className={`rounded-2xl border p-4 text-center ${count > 0 ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <Icon className={`mx-auto mb-2 h-5 w-5 ${count > 0 ? "text-green-600" : "text-amber-600"}`} />
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Automatic:</strong> teacher selection, leave handling, room assignment, workload balancing, subject rotation, break rules, coverage checking, and genetic timetable balancing.
            </div>

            <div className="hidden grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
              <label className="space-y-2 text-sm font-medium">
                <span>Semester</span>
                <select
                  value="all"
                  onChange={() => undefined}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="all">All semesters</option>
                  {semesters.map(semester => <option key={semester.id} value={semester.id}>Semester {semester.number} · Year {semester.year}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Subject</span>
                <select
                  value="all"
                  onChange={() => undefined}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="all">All subjects</option>
                  {subjectsForSemester.map(subject => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}
                </select>
              </label>
            </div>

            {subjects.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border text-muted-foreground">
                Upload or add faculty, subjects, semesters, classrooms, and lecture slots first.
              </div>
            ) : (
              <div className="hidden rounded-2xl border border-border overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/40 text-sm font-semibold">
                  <span>Semester / Year</span><span>Subject</span><span>Automatic assignment</span>
                </div>
                {subjectsForReview.map(subject => {
                  const semester = semesters.find(item => item.number === subject.semester);
                  const assigned = faculty.find(item => item.id === subject.facultyId);
                  return (
                    <div key={subject.id} className="grid grid-cols-3 gap-4 p-4 border-t border-border text-sm">
                      <span className="text-muted-foreground">Sem {subject.semester} · Year {semester?.year || subject.year || "-"} · Div {subject.division || "All"}</span>
                      <span><strong>{subject.name}</strong><small className="block text-muted-foreground">{subject.code} · {subject.lectureCountPerWeek} lectures/week</small></span>
                      <span className="text-muted-foreground">{assigned?.status === "active" ? assigned.name : "Eligible active faculty / room selected automatically"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2">
              <div className="text-sm text-muted-foreground">No manual faculty, room, semester, or subject selection is required.</div>
              <Button size="xl" variant="gradient" className="w-full sm:w-auto text-lg shadow-primary/30 shadow-lg" onClick={handleGenerate} disabled={subjects.length === 0}>
                <Zap className="w-5 h-5 mr-2 fill-current" /> Generate Timetable Automatically
              </Button>
            </div>
          </div>

          <div className="hidden justify-center gap-3">
            <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10" onClick={() => { store.loadDummyData(); toast.success("Dummy data loaded successfully!"); }}>
              Load Dummy Data
            </Button>
            <Button variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => { store.clearData(); toast.success("All data cleared!"); }}>
              Clear All Data
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TimetableGeneratorV2;
