import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Users, Search, Save, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Student } from "@/types";

interface StudentManagerProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, "id">) => void;
  onUpdateStudent: (id: string, student: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
}

const StudentManager = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
}: StudentManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [newStudent, setNewStudent] = useState({
    name: "",
    rollNumber: "",
    year: 1,
    email: "",
  });

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear =
      selectedYear === "all" || student.year.toString() === selectedYear;
    return matchesSearch && matchesYear;
  });

  const handleSubmit = () => {
    if (!newStudent.name || !newStudent.rollNumber || !newStudent.email) return;

    if (editingId) {
      onUpdateStudent(editingId, newStudent);
      setEditingId(null);
    } else {
      onAddStudent(newStudent);
    }

    setNewStudent({ name: "", rollNumber: "", year: 1, email: "" });
    setIsDialogOpen(false);
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setNewStudent({
      name: student.name,
      rollNumber: student.rollNumber,
      year: student.year,
      email: student.email,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-6 rounded-2xl shadow-card"
      >
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl gradient-accent">
              <Users className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Student Management</h2>
              <p className="text-sm text-muted-foreground">
                {students.length} students enrolled
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gradient-primary border-0"
                  onClick={() => {
                    setEditingId(null);
                    setNewStudent({ name: "", rollNumber: "", year: 1, email: "" });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Student" : "Add New Student"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? "Update the student details"
                      : "Enter the details for the new student"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="e.g., John Doe"
                      value={newStudent.name}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input
                      placeholder="e.g., 2024CS001"
                      value={newStudent.rollNumber}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, rollNumber: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="e.g., john@college.edu"
                      value={newStudent.email}
                      onChange={(e) =>
                        setNewStudent({ ...newStudent, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select
                      value={newStudent.year.toString()}
                      onValueChange={(value) =>
                        setNewStudent({ ...newStudent, year: Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} className="gradient-primary border-0">
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? "Update" : "Add"} Student
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, roll number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3</SelectItem>
              <SelectItem value="4">Year 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl shadow-card overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Year</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student, index) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {student.rollNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {student.email}
                </TableCell>
                <TableCell className="text-center">
                  <span className="px-2 py-1 rounded-full bg-secondary text-sm">
                    Year {student.year}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(student)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteStudent(student.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground">
              Add students or adjust your search filters
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentManager;
