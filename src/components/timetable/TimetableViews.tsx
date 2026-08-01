import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import TimetableGrid from "./TimetableGrid";

const TimetableViews = () => {
  const { 
    timetableEntries, semesters, faculty, classrooms, collegeConfig, 
    activeView, setActiveView, selectedSemesterId, setSelectedSemester, 
    selectedDivisionId, setSelectedDivision 
  } = useTimetableStore();

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");

  const selectedSem = semesters.find(s => s.id === selectedSemesterId);

  // Initialize selections if empty
  if (!selectedSemesterId && semesters.length > 0) {
    setSelectedSemester(semesters[0].id);
    if (semesters[0].divisions.length > 0) {
      setSelectedDivision(semesters[0].divisions[0].id);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (timetableEntries.length === 0) {
    return (
      <div className="text-center py-20 glass-card rounded-2xl">
        <h3 className="text-xl font-semibold mb-2">No Timetable Generated</h3>
        <p className="text-muted-foreground">Go to the Generator tab to create a timetable first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="section-title">Timetable Viewer</h2>
          <p className="section-subtitle">View and print schedules from multiple perspectives.</p>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export / Print
        </Button>
      </div>

      <div className="glass-card p-4 rounded-2xl">
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="student">Student View</TabsTrigger>
              <TabsTrigger value="faculty">Faculty View</TabsTrigger>
              <TabsTrigger value="room">Room View</TabsTrigger>
              <TabsTrigger value="master">Master View</TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-3">
              {activeView === "student" && (
                <>
                  <Select value={selectedSemesterId} onValueChange={setSelectedSemester}>
                    <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Semester" /></SelectTrigger>
                    <SelectContent>
                      {semesters.map(s => <SelectItem key={s.id} value={s.id}>Semester {s.number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivision}>
                    <SelectTrigger className="w-[120px] bg-background"><SelectValue placeholder="Division" /></SelectTrigger>
                    <SelectContent>
                      {selectedSem?.divisions.map(d => <SelectItem key={d.id} value={d.id}>Div {d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              )}

              {activeView === "faculty" && (
                <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger className="w-[200px] bg-background"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculty</SelectItem>
                    {faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {activeView === "room" && (
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Select Room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {classrooms.map(r => <SelectItem key={r.id} value={r.id}>{r.roomNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <TabsContent value="student" className="m-0 border-none outline-none">
              <TimetableGrid 
                viewType="student" 
                filterId={`${selectedSemesterId}__${selectedDivisionId}`} 
              />
            </TabsContent>
            
            <TabsContent value="faculty" className="m-0 border-none outline-none">
              <TimetableGrid 
                viewType="faculty" 
                filterId={selectedFacultyId} 
              />
            </TabsContent>

            <TabsContent value="room" className="m-0 border-none outline-none">
              <TimetableGrid 
                viewType="room" 
                filterId={selectedRoomId} 
              />
            </TabsContent>
            
            <TabsContent value="master" className="m-0 border-none outline-none p-8 text-center text-muted-foreground">
              Master view requires a larger screen or horizontal scrolling. Not implemented in this preview.
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default TimetableViews;
