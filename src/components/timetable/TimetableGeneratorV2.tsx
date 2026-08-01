import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import { generateTimetable } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle2, RotateCcw, Calendar as CalendarIcon, Download, Users, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import ConflictPanel from "./ConflictPanel";
import { downloadTimetableCsv } from "@/lib/timetableExport";

const TimetableGeneratorV2 = () => {
  const navigate = useNavigate();
  const store = useTimetableStore();
  const { 
    collegeConfig, faculty, subjects, classrooms, semesters, timeSlots, leaveEntries,
    isGenerating, setIsGenerating, setTimetableEntries, setGenerationResult, setConflicts,
    generationResult, conflicts, timetableEntries
  } = store;

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("all");
  const [selectedDivisionId, setSelectedDivisionId] = useState("all");
  const [facultySelections, setFacultySelections] = useState<Record<string, string>>({});
  const [classroomSelections, setClassroomSelections] = useState<Record<string, string>>({});

  const getEligibleFaculty = (subjectId: string) => {
    const subject = subjects.find(item => item.id === subjectId);
    return faculty.filter(f =>
      f.status === "active" &&
      (subject?.facultyId === f.id || f.subjectIds?.includes(subjectId) || f.subjectIds?.length === 0)
    );
  };

  const getSubjectStudentCount = (subjectSemester: number, subjectDivision: string) => {
    const matchingDivisions = semesters.flatMap(semester =>
      semester.number === subjectSemester
        ? semester.divisions.filter(division => subjectDivision === "All" || !subjectDivision || division.name === subjectDivision)
        : []
    );
    return Math.max(0, ...matchingDivisions.map(division => division.studentCount));
  };

  const getCompatibleRooms = (subject: (typeof subjects)[number]) => {
    const isLab = subject.labRequired || subject.type === "lab";
    const minimumCapacity = getSubjectStudentCount(subject.semester, subject.division);
    return classrooms.filter(room =>
      room.status === "available" &&
      room.capacity >= minimumCapacity &&
      (isLab ? room.roomType === "lab" : room.roomType === "classroom" || room.roomType === "seminar_hall")
    );
  };

  useEffect(() => {
    setFacultySelections(previous => {
      const next = { ...previous };
      subjects.forEach(subject => {
        if (!next[subject.id]) {
          const assigned = subject.facultyId && faculty.some(item => item.id === subject.facultyId && item.status === "active")
            ? subject.facultyId
            : getEligibleFaculty(subject.id)[0]?.id || "";
          next[subject.id] = assigned;
        }
      });
      return next;
    });
    setClassroomSelections(previous => {
      const next = { ...previous };
      subjects.forEach(subject => {
        if (!next[subject.id]) next[subject.id] = getCompatibleRooms(subject)[0]?.id || "";
      });
      return next;
    });
  }, [subjects, faculty, classrooms, semesters]);

  const subjectsForReview = subjects.filter(subject => {
    if (selectedSemesterId !== "all" && !semesters.some(semester => semester.id === selectedSemesterId && semester.number === subject.semester)) return false;
    if (selectedDivisionId !== "all" && subject.division !== "All" && subject.division !== selectedDivisionId) return false;
    return true;
  });

  const getSubjectContext = (subject: (typeof subjects)[number]) => semesters
    .filter(semester => semester.number === subject.semester)
    .flatMap(semester => semester.divisions
      .filter(division => subject.division === "All" || !subject.division || division.name === subject.division)
      .map(division => `Sem ${semester.number} · Div ${division.name}`))
    .join(", ");

  const handleRegenerate = () => {
    setGenerationResult(null);
    setConflicts([]);
    setTimetableEntries([]);
  };

  const handleGenerate = () => {
    // Validation
    if (!collegeConfig.isConfigured) return toast.error("Please configure college settings first");
    if (faculty.length === 0) return toast.error("Add at least one faculty member");
    if (subjects.length === 0) return toast.error("Add at least one subject");
    if (classrooms.length === 0) return toast.error("Add at least one classroom");
    if (semesters.length === 0) return toast.error("Add at least one semester");
    if (timeSlots.length === 0) return toast.error("Configure time slots first");

    const missingFaculty = subjects.filter(subject => !facultySelections[subject.id]);
    const missingClassroom = subjects.filter(subject => !classroomSelections[subject.id]);
    if (missingFaculty.length > 0 || missingClassroom.length > 0) {
      const missingLabels = [...new Set([
        ...missingFaculty.map(subject => `${subject.name}: teacher`),
        ...missingClassroom.map(subject => `${subject.name}: classroom`),
      ])];
      return toast.error(`Complete the assignment selections first: ${missingLabels.slice(0, 3).join(", ")}${missingLabels.length > 3 ? "..." : ""}`);
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusText("Initializing scheduling engine...");

    // Simulate progress for UI feel
    const intervals = [
      { p: 20, t: "Loading constraints..." },
      { p: 40, t: "Assigning labs & practicals..." },
      { p: 60, t: "Scheduling theory lectures..." },
      { p: 80, t: "Checking conflicts..." },
      { p: 95, t: "Optimizing layout..." }
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
          semesters,
          timeSlots,
          leaveEntries,
          facultyOverrides: facultySelections,
          classroomOverrides: classroomSelections,
        });

        setProgress(100);
        setStatusText("Complete!");
        
        setGenerationResult(result);
        setTimetableEntries(result.entries);
        setConflicts(result.conflicts);
        
        if (result.success) {
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
  const reviewDivisions = semesters.find(semester => semester.id === selectedSemesterId)?.divisions || [];
  const incompleteSelections = subjects.filter(subject => !facultySelections[subject.id] || !classroomSelections[subject.id]).length;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight">Smart Generator</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Automatically create conflict-free schedules using AI-powered constraint satisfaction algorithms.
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
                <h3 className="text-2xl font-bold">Prepare Generation</h3>
                <p className="text-muted-foreground mt-1">
                  Choose the teacher and classroom for each subject. The solver will generate the complete timetable without double-booking anyone.
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-semibold">{subjects.length} subjects</span>
                <span className={`px-3 py-2 rounded-xl font-semibold ${incompleteSelections ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"}`}>
                  {incompleteSelections ? `${incompleteSelections} incomplete` : "Ready"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
              <label className="space-y-2 text-sm font-medium">
                <span>Review Semester</span>
                <select
                  value={selectedSemesterId}
                  onChange={event => { setSelectedSemesterId(event.target.value); setSelectedDivisionId("all"); }}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="all">All Semesters</option>
                  {semesters.map(semester => <option key={semester.id} value={semester.id}>Semester {semester.number}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Review Division</span>
                <select
                  value={selectedDivisionId}
                  onChange={event => setSelectedDivisionId(event.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="all">All Divisions</option>
                  {reviewDivisions.map(division => <option key={division.id} value={division.name}>Division {division.name}</option>)}
                </select>
              </label>
            </div>

            {subjects.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border text-muted-foreground">
                Upload or add faculty, subjects, semesters, classrooms, and lecture slots first.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm min-w-[850px]">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="text-left p-4 font-semibold">Semester / Division</th>
                      <th className="text-left p-4 font-semibold">Subject</th>
                      <th className="text-left p-4 font-semibold"><span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> Teacher</span></th>
                      <th className="text-left p-4 font-semibold"><span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4" /> Classroom</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectsForReview.map(subject => {
                      const eligibleFaculty = getEligibleFaculty(subject.id);
                      const compatibleRooms = getCompatibleRooms(subject);
                      const hasMissingChoice = !facultySelections[subject.id] || !classroomSelections[subject.id];
                      return (
                        <tr key={subject.id} className="border-t border-border align-top">
                          <td className="p-4 text-muted-foreground whitespace-nowrap">{getSubjectContext(subject) || `Semester ${subject.semester} · Div ${subject.division || "A"}`}</td>
                          <td className="p-4">
                            <p className="font-semibold">{subject.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{subject.code} · {subject.lectureCountPerWeek} lectures/week · {subject.type}</p>
                          </td>
                          <td className="p-4">
                            <select
                              value={facultySelections[subject.id] || ""}
                              onChange={event => setFacultySelections(previous => ({ ...previous, [subject.id]: event.target.value }))}
                              className={`w-full h-10 rounded-lg border bg-background px-3 text-sm ${hasMissingChoice && !facultySelections[subject.id] ? "border-amber-500" : "border-border"}`}
                            >
                              <option value="">Select teacher</option>
                              {eligibleFaculty.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            {eligibleFaculty.length === 0 && <p className="text-xs text-red-500 mt-1">No eligible active teacher</p>}
                          </td>
                          <td className="p-4">
                            <select
                              value={classroomSelections[subject.id] || ""}
                              onChange={event => setClassroomSelections(previous => ({ ...previous, [subject.id]: event.target.value }))}
                              className={`w-full h-10 rounded-lg border bg-background px-3 text-sm ${hasMissingChoice && !classroomSelections[subject.id] ? "border-amber-500" : "border-border"}`}
                            >
                              <option value="">Select classroom</option>
                              {compatibleRooms.map(room => <option key={room.id} value={room.id}>{room.roomNumber} · {room.roomType} · {room.capacity} seats</option>)}
                            </select>
                            {compatibleRooms.length === 0 && <p className="text-xs text-red-500 mt-1">No compatible available room</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2">
              <div className="text-sm text-muted-foreground">All uploaded subjects are generated. The filters only control which rows you review.</div>
              <Button
                size="xl"
                variant="gradient"
                className="w-full sm:w-auto text-lg shadow-primary/30 shadow-lg"
                onClick={handleGenerate}
                disabled={subjects.length === 0}
              >
                <Zap className="w-5 h-5 mr-2 fill-current" /> Generate Conflict-Free Timetable
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-3">
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
