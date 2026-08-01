import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Faculty } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Mail, Briefcase, Filter, Users } from "lucide-react";
import { toast } from "sonner";
import { STATUS_COLORS } from "@/lib/utils";
import FacultyForm from "./FacultyForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FacultyManager = () => {
  const { faculty, deleteFaculty } = useTimetableStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | undefined>();

  const filteredFaculty = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (f: Faculty) => {
    setEditingFaculty(f);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this faculty member?")) {
      deleteFaculty(id);
      toast.success("Faculty deleted successfully");
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingFaculty(undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="section-title">Faculty Management</h2>
          <p className="section-subtitle">Manage college teaching staff and their workloads.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} variant="gradient" className="gap-2">
          <Plus className="w-4 h-4" /> Add Faculty
        </Button>
      </div>

      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50"
          />
        </div>
        <Button variant="outline" className="gap-2 shrink-0">
          <Filter className="w-4 h-4" /> Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFaculty.map((f, i) => (
          <div key={f.id} className="glass-card rounded-2xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Status indicator line */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-${f.status === 'active' ? 'green' : f.status === 'on-leave' ? 'purple' : 'gray'}-500`} />
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {f.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{f.name}</h3>
                  <Badge variant="outline" className={STATUS_COLORS[f.status] || ''}>
                    {f.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>{f.designation}, {f.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="truncate">{f.email}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Weekly Load</p>
                 <p className="text-lg font-semibold text-foreground">{f.weeklyLoad} <span className="text-sm font-normal text-muted-foreground">lectures</span></p>
               </div>
               <div>
                 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subjects</p>
                 <p className="text-lg font-semibold text-foreground">{f.subjectIds.length}</p>
               </div>
            </div>
          </div>
        ))}
        {filteredFaculty.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground glass-card rounded-2xl">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">No faculty members found</p>
            <p className="text-sm mt-1">Try adjusting your search or add a new faculty member.</p>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}</DialogTitle>
          </DialogHeader>
          <FacultyForm 
            initialData={editingFaculty} 
            onSuccess={closeForm} 
            onCancel={closeForm} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacultyManager;
