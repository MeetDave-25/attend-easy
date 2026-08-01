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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>();
  const [formData, setFormData] = useState<Partial<Subject>>({
    name: "", code: "", semester: 1, division: "A", lectureCountPerWeek: 4, labRequired: false, theoryHours: 4, labHours: 0, credits: 4, type: 'theory'
  });

  const filteredSubjects = subjects.filter(
    (s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openForm = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData(subject);
    } else {
      setEditingSubject(undefined);
      setFormData({ name: "", code: "", semester: 1, division: "A", lectureCountPerWeek: 4, labRequired: false, theoryHours: 4, labHours: 0, credits: 4, type: 'theory' });
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

      <div className="glass-card p-4 rounded-2xl flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search subjects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
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
               <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No subjects found</td></tr>
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
                <Label>Division</Label>
                <Input value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Required Lectures Per Week</Label>
                <Input type="number" value={formData.lectureCountPerWeek} onChange={e => setFormData({...formData, lectureCountPerWeek: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Assign Faculty (Optional)</Label>
                <Select value={formData.facultyId || "none"} onValueChange={v => setFormData({...formData, facultyId: v === "none" ? undefined : v})}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned / Auto-assign</SelectItem>
                    {faculty.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
