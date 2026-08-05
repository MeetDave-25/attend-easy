import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const SubjectManager = () => {
  const { subjects, addSubject, updateSubject, deleteSubject, faculty } = useTimetableStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>();
  const [formData, setFormData] = useState<Partial<Subject>>({
    name: "", code: "", year: 1, semester: 1, division: "A", lectureCountPerWeek: 4, labRequired: false, theoryHours: 4, labHours: 0, credits: 4, type: 'theory'
  });

  const getSubjectYear = (subject: Subject) => subject.year || Math.ceil(subject.semester / 2);
  const yearOptions = Array.from(new Set(subjects.map(getSubjectYear))).sort((a, b) => a - b);
  const semesterOptions = Array.from(new Set(
    subjects
      .filter((subject) => yearFilter === "all" || String(getSubjectYear(subject)) === yearFilter)
      .map((subject) => subject.semester)
  )).sort((a, b) => a - b);

  const filteredSubjects = subjects.filter(
    (s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = yearFilter === "all" || String(getSubjectYear(s)) === yearFilter;
      const matchesSemester = semesterFilter === "all" || String(s.semester) === semesterFilter;
      return matchesSearch && matchesYear && matchesSemester;
    }
  );

  const openForm = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({ ...subject, year: subject.year || Math.ceil(subject.semester / 2) });
    } else {
      setEditingSubject(undefined);
      setFormData({ name: "", code: "", year: 1, semester: 1, division: "A", lectureCountPerWeek: 4, labRequired: false, theoryHours: 4, labHours: 0, credits: 4, type: 'theory' });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("Name and Code are required");
      return;
    }
    
    if (editingSubject) {
      updateSubject(editingSubject.id, formData as Subject);
      toast.success("Subject updated successfully");
    } else {
      addSubject(formData as Omit<Subject, 'id'>);
      toast.success("Subject added successfully");
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this subject? This might affect the timetable.")) {
      deleteSubject(id);
      toast.success("Subject deleted");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-title">Subjects</h2>
          <p className="section-subtitle">Manage curriculum and workload requirements.</p>
        </div>
        <Button onClick={() => openForm()} variant="gradient" className="gap-2">
          <Plus className="w-4 h-4" /> Add Subject
        </Button>
      </div>

      <div className="glass-card p-4 rounded-2xl flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search subjects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
          <Select value={yearFilter} onValueChange={(value) => { setYearFilter(value); setSemesterFilter("all"); }}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {yearOptions.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesterOptions.map((semester) => <SelectItem key={semester} value={String(semester)}>Semester {semester}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Year</th>
              <th>Sem / Div</th>
              <th>Type</th>
              <th>Lectures/Wk</th>
              <th>Assigned Faculty</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.map((subject) => {
              const assignedFaculty = faculty.find(f => f.id === subject.facultyId);
              return (
                <tr key={subject.id}>
                  <td className="font-mono text-sm">{subject.code}</td>
                  <td className="font-medium">{subject.name}</td>
                  <td>Year {getSubjectYear(subject)}</td>
                  <td>Sem {subject.semester} - Div {subject.division}</td>
                  <td>
                    <Badge variant={subject.type === 'lab' ? 'lab' : 'theory'}>
                      {subject.type}
                    </Badge>
                  </td>
                  <td>{subject.lectureCountPerWeek}</td>
                  <td>{assignedFaculty ? assignedFaculty.name : <span className="text-muted-foreground italic">Unassigned</span>}</td>
                  <td className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openForm(subject)}><Edit2 className="w-4 h-4 text-blue-500" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              )
            })}
            {filteredSubjects.length === 0 && (
               <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No subjects found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Subject Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as any, labRequired: v === 'lab'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="lab">Lab / Practical</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Input type="number" value={formData.semester} onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" min="1" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Input value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Required Lectures Per Week</Label>
                <Input type="number" value={formData.lectureCountPerWeek} onChange={e => setFormData({...formData, lectureCountPerWeek: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2 col-span-2 pt-2 border-t border-border">
                <Label className="flex items-center gap-1.5">
                  Assigned Faculty
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(strict — only this teacher will ever be scheduled)</span>
                </Label>
                <Select value={formData.facultyId || "none"} onValueChange={v => setFormData({...formData, facultyId: v === "none" ? undefined : v})}>
                  <SelectTrigger className={!formData.facultyId ? "border-amber-500/40" : "border-green-500/40"}>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">⚠ Unassigned — any eligible faculty</SelectItem>
                    {faculty.filter(f => f.status === "active").map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} {f.type === "visiting" ? "(Visiting)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.facultyId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ No faculty assigned — for best results, assign a specific faculty to each subject.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient">Save Subject</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectManager;
