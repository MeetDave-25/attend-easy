import { useEffect, useMemo, useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import TimetableGrid from "./TimetableGrid";
import CollegeDailyTimetable from "./CollegeDailyTimetable";
import { downloadTimetableCsv } from "@/lib/timetableExport";

const TimetableViews = () => {
  const {
    timetableEntries, semesters, faculty, subjects, classrooms, collegeConfig, timeSlots,
    activeView, setActiveView, selectedSemesterId, setSelectedSemester,
    selectedDivisionId, setSelectedDivision,
  } = useTimetableStore();
  const [selectedFacultyId, setSelectedFacultyId] = useState("all");
  const [layout, setLayout] = useState<"daily" | "weekly">("daily");
  const [selectedDay, setSelectedDay] = useState(() => collegeConfig.workingDays[0] || "Monday");

  // Older saved state could contain the removed room/master tabs.
  useEffect(() => {
    if (activeView !== "student" && activeView !== "faculty") setActiveView("faculty");
  }, [activeView, setActiveView]);

  const visibleSemesters = useMemo(() => {
    if (selectedSemesterId === "all" || !selectedSemesterId) return semesters;
    return semesters.filter(semester => semester.id === selectedSemesterId);
  }, [semesters, selectedSemesterId]);

  const selectedSemester = semesters.find(semester => semester.id === selectedSemesterId);
  const availableDays = useMemo(() => {
    const configuredDays = collegeConfig.workingDays.filter((day) => timeSlots.some((slot) => slot.day === day));
    return configuredDays.length > 0
      ? configuredDays
      : Array.from(new Set(timeSlots.map((slot) => slot.day)));
  }, [collegeConfig.workingDays, timeSlots]);

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  useEffect(() => {
    if (selectedSemesterId && selectedSemesterId !== "all" && !selectedSemester) {
      setSelectedSemester("all");
      setSelectedDivision("all");
    }
  }, [selectedSemesterId, selectedSemester, setSelectedSemester, setSelectedDivision]);

  if (timetableEntries.length === 0) {
    return (
      <div className="text-center py-20 glass-card rounded-2xl">
        <h3 className="text-xl font-semibold mb-2">No Timetable Generated</h3>
        <p className="text-muted-foreground">Go to the Generator tab to create a timetable first.</p>
      </div>
    );
  }

  const renderSemesterSections = (viewType: "faculty" | "student") => (
    <div className="space-y-6">
      {visibleSemesters.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">No timetable data for this semester.</div>
      ) : visibleSemesters.map(semester => (
        <section key={semester.id} className="rounded-2xl border border-border overflow-hidden bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 bg-secondary/30 border-b border-border">
            <div>
              <h3 className="font-bold text-lg">Year {semester.year} · Semester {semester.number}</h3>
              <p className="text-xs text-muted-foreground">{semester.divisions.length} division{semester.divisions.length === 1 ? "" : "s"} · separate schedule</p>
            </div>
            {viewType === "faculty" && selectedFacultyId !== "all" && (
              <span className="text-sm text-muted-foreground">Filtered faculty schedule</span>
            )}
          </div>
          {layout === "daily" ? (
            <CollegeDailyTimetable
              viewType={viewType}
              semesterId={semester.id}
              day={selectedDay}
              divisionFilterId={viewType === "student" ? selectedDivisionId || "all" : "all"}
              facultyFilterId={viewType === "faculty" ? selectedFacultyId : "all"}
            />
          import { DndProvider } from 'react-dnd';
          import { HTML5Backend } from 'react-dnd-html5-backend';
          // ...
                    ) : (
                      <DndProvider backend={HTML5Backend}>
                        <TimetableGrid
                          viewType={viewType}
                          filterId={viewType === 'student' ? `${semester.id}__${selectedDivisionId || "all"}` : selectedFacultyId}
                          semesterFilterId={semester.id}
                        />
                      </DndProvider>
                    )}
                  </section>
                ))}
              </div>
            );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="section-title">Timetable Viewer</h2>
          <p className="section-subtitle">Choose a semester to see only its subjects, or view every semester in separate sections.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadTimetableCsv(timetableEntries, subjects, faculty, classrooms, semesters)} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-2xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="space-y-2 text-sm font-medium">
            <span>Semester</span>
            <select
              value={selectedSemesterId || "all"}
              onChange={event => { setSelectedSemester(event.target.value); setSelectedDivision("all"); }}
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="all">All semesters · separate sections</option>
              {semesters.map(semester => <option key={semester.id} value={semester.id}>Year {semester.year} · Semester {semester.number}</option>)}
            </select>
          </label>

          {activeView === "student" ? (
            <label className="space-y-2 text-sm font-medium">
              <span>Division</span>
              <select
                value={selectedDivisionId || "all"}
                onChange={event => setSelectedDivision(event.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="all">All divisions</option>
                {selectedSemester?.divisions.map(division => <option key={division.id} value={division.id}>Division {division.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="space-y-2 text-sm font-medium">
              <span>Faculty filter</span>
              <select value={selectedFacultyId} onChange={event => setSelectedFacultyId(event.target.value)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="all">All faculty · complete details</option>
                {faculty.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          )}

          <label className="space-y-2 text-sm font-medium">
            <span>Format</span>
            <select value={layout} onChange={event => setLayout(event.target.value as "daily" | "weekly")} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="daily">College daily sheet</option>
              <option value="weekly">Weekly grid</option>
            </select>
          </label>

          {layout === "daily" ? (
            <label className="space-y-2 text-sm font-medium">
              <span>Day</span>
              <select value={selectedDay} onChange={event => setSelectedDay(event.target.value)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm">
                {availableDays.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
          ) : (
            <div className="flex items-end text-sm text-muted-foreground rounded-xl bg-secondary/30 px-3 py-2">
              {visibleSemesters.length} semester{visibleSemesters.length === 1 ? "" : "s"} shown separately
            </div>
          )}
        </div>

        <Tabs value={activeView === "student" ? "student" : "faculty"} onValueChange={setActiveView} className="w-full">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="faculty">Faculty / Admin View</TabsTrigger>
            <TabsTrigger value="student">Student View</TabsTrigger>
          </TabsList>
          <TabsContent value="faculty" className="mt-5">
            {renderSemesterSections("faculty")}
          </TabsContent>
          <TabsContent value="student" className="mt-5">
            {renderSemesterSections("student")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TimetableViews;
