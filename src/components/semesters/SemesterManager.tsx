import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Semester, Division } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const SemesterManager = () => {
  const { semesters, addSemester, updateSemester, deleteSemester, addDivision, deleteDivision } = useTimetableStore();
  const [isSemFormOpen, setIsSemFormOpen] = useState(false);
  const [isDivFormOpen, setIsDivFormOpen] = useState(false);
  const [editingSem, setEditingSem] = useState<Semester | undefined>();
  const [activeSemId, setActiveSemId] = useState<string>("");
  
  const [semData, setSemData] = useState<Partial<Semester>>({ number: 1, year: new Date().getFullYear(), isActive: true, divisions: [] });
  const [divData, setDivData] = useState<Partial<Division>>({ name: "A", studentCount: 60, subjectIds: [] });

  const openSemForm = (sem?: Semester) => {
    if (sem) {
      setEditingSem(sem);
      setSemData(sem);
    } else {
      setEditingSem(undefined);
      const maxNum = semesters.length > 0 ? Math.max(...semesters.map(s => s.number)) : 0;
      setSemData({ number: maxNum + 1, year: new Date().getFullYear(), isActive: true, divisions: [] });
    }
    setIsSemFormOpen(true);
  };

  const handleSemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSem) {
      updateSemester(editingSem.id, semData as Semester);
      toast.success("Semester updated");
    } else {
      addSemester(semData as Omit<Semester, 'id'>);
      toast.success("Semester added");
    }
    setIsSemFormOpen(false);
  };

  const openDivForm = (semId: string) => {
    setActiveSemId(semId);
    setDivData({ name: "A", studentCount: 60, subjectIds: [] });
    setIsDivFormOpen(true);
  };

  const handleDivSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDivision(activeSemId, divData as Omit<Division, 'id' | 'semesterId'>);
    toast.success("Division added");
    setIsDivFormOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-title">Semesters & Divisions</h2>
          <p className="section-subtitle">Manage academic terms and student cohorts.</p>
        </div>
        <Button onClick={() => openSemForm()} variant="gradient" className="gap-2">
          <Plus className="w-4 h-4" /> Add Semester
        </Button>
      </div>

      <div className="space-y-6">
        {semesters.sort((a, b) => a.number - b.number).map((sem) => (
          <div key={sem.id} className="glass-card rounded-2xl overflow-hidden">
            <div className="bg-secondary/30 p-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">Semester {sem.number}</h3>
                <Badge variant={sem.isActive ? "success" : "secondary"}>{sem.isActive ? "Active" : "Inactive"}</Badge>
                <span className="text-sm text-muted-foreground ml-2">Academic Year: {sem.year}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openDivForm(sem.id)} className="gap-1 h-8">
                  <Plus className="w-3 h-3" /> Add Division
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openSemForm(sem)} className="h-8 w-8 text-blue-500"><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteSemester(sem.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {sem.divisions.map((div) => (
                <div key={div.id} className="border border-border rounded-xl p-4 flex justify-between items-center hover:border-primary/50 transition-colors">
                  <div>
                    <h4 className="font-bold text-lg mb-1">Division {div.name}</h4>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{div.studentCount} students</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteDivision(sem.id, div.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {sem.divisions.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground py-4">No divisions added yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isSemFormOpen} onOpenChange={setIsSemFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSem ? 'Edit Semester' : 'Add Semester'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSemSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Semester Number</Label>
                <Input type="number" value={semData.number} onChange={e => setSemData({...semData, number: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input type="number" value={semData.year} onChange={e => setSemData({...semData, year: parseInt(e.target.value)})} />
              </div>
              <div className="flex items-center justify-between col-span-2 border p-3 rounded-xl mt-2">
                <div>
                  <Label className="text-base">Active Status</Label>
                  <p className="text-sm text-muted-foreground">Is this semester currently running?</p>
                </div>
                <Switch checked={semData.isActive} onCheckedChange={c => setSemData({...semData, isActive: c})} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsSemFormOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient">Save Semester</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDivFormOpen} onOpenChange={setIsDivFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Division</DialogTitle></DialogHeader>
          <form onSubmit={handleDivSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Division Name (e.g., A, B, C)</Label>
              <Input value={divData.name} onChange={e => setDivData({...divData, name: e.target.value.toUpperCase()})} />
            </div>
            <div className="space-y-2">
              <Label>Number of Students</Label>
              <Input type="number" value={divData.studentCount} onChange={e => setDivData({...divData, studentCount: parseInt(e.target.value)})} />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDivFormOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient">Add Division</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SemesterManager;
