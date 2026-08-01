import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Save, Pencil, Trash2, GraduationCap } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Student, Subject, TestMark } from "@/types";
import { cn } from "@/lib/utils";

interface MarksManagerProps {
  students: Student[];
  subjects: Subject[];
  marks: TestMark[];
  onAddMark: (mark: Omit<TestMark, "id">) => void;
  onUpdateMark: (id: string, mark: Partial<TestMark>) => void;
  onDeleteMark: (id: string) => void;
}

const MarksManager = ({
  students,
  subjects,
  marks,
  onAddMark,
  onUpdateMark,
  onDeleteMark,
}: MarksManagerProps) => {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedTest, setSelectedTest] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    testName: "",
    maxMarks: 100,
  });
  const [editingMarks, setEditingMarks] = useState<Record<string, number>>({});

  const testNames = [...new Set(marks.map((m) => m.testName))];

  const filteredMarks = marks.filter(
    (m) =>
      (selectedSubject === "all" || m.subjectId === selectedSubject) &&
      (selectedTest === "all" || m.testName === selectedTest)
  );

  const handleCreateTest = () => {
    if (!newTest.testName || !selectedSubject) return;

    students.forEach((student) => {
      onAddMark({
        studentId: student.id,
        subjectId: selectedSubject,
        testName: newTest.testName,
        maxMarks: newTest.maxMarks,
        obtainedMarks: 0,
        date: new Date(),
      });
    });

    setNewTest({ testName: "", maxMarks: 100 });
    setIsDialogOpen(false);
  };

  const handleSaveMarks = () => {
    Object.entries(editingMarks).forEach(([markId, obtainedMarks]) => {
      onUpdateMark(markId, { obtainedMarks });
    });
    setEditingMarks({});
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: "A+", color: "text-success" };
    if (percentage >= 80) return { grade: "A", color: "text-success" };
    if (percentage >= 70) return { grade: "B", color: "text-accent" };
    if (percentage >= 60) return { grade: "C", color: "text-warning" };
    if (percentage >= 50) return { grade: "D", color: "text-warning" };
    return { grade: "F", color: "text-destructive" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-6 rounded-2xl shadow-card"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl gradient-accent">
              <GraduationCap className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Test Marks</h2>
              <p className="text-sm text-muted-foreground">
                Manage and track student performance
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary border-0">
                <Plus className="w-4 h-4 mr-2" />
                New Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
                <DialogDescription>
                  Add a new test for all students in the selected subject
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Test Name</Label>
                  <Input
                    placeholder="e.g., Mid-term Exam"
                    value={newTest.testName}
                    onChange={(e) =>
                      setNewTest({ ...newTest, testName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Marks</Label>
                  <Input
                    type="number"
                    value={newTest.maxMarks}
                    onChange={(e) =>
                      setNewTest({ ...newTest, maxMarks: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTest} className="gradient-primary border-0">
                  Create Test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by test" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tests</SelectItem>
              {testNames.map((test) => (
                <SelectItem key={test} value={test}>
                  {test}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {Object.keys(editingMarks).length > 0 && (
            <Button onClick={handleSaveMarks} className="ml-auto">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </motion.div>

      {/* Marks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl shadow-card overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Test</TableHead>
              <TableHead className="text-center">Obtained</TableHead>
              <TableHead className="text-center">Max</TableHead>
              <TableHead className="text-center">Percentage</TableHead>
              <TableHead className="text-center">Grade</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMarks.map((mark) => {
              const student = students.find((s) => s.id === mark.studentId);
              const subject = subjects.find((s) => s.id === mark.subjectId);
              const percentage = Math.round(
                (mark.obtainedMarks / mark.maxMarks) * 100
              );
              const { grade, color } = getGrade(percentage);
              const isEditing = mark.id in editingMarks;

              return (
                <TableRow key={mark.id}>
                  <TableCell className="font-medium">
                    {student?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{subject?.code || "N/A"}</TableCell>
                  <TableCell>{mark.testName}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      max={mark.maxMarks}
                      value={
                        isEditing ? editingMarks[mark.id] : mark.obtainedMarks
                      }
                      onChange={(e) =>
                        setEditingMarks({
                          ...editingMarks,
                          [mark.id]: Number(e.target.value),
                        })
                      }
                      className="w-20 text-center mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">{mark.maxMarks}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-sm font-medium",
                        percentage >= 75
                          ? "bg-success/10 text-success"
                          : percentage >= 50
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {percentage}%
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-center font-bold", color)}>
                    {grade}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingMarks({
                            ...editingMarks,
                            [mark.id]: mark.obtainedMarks,
                          })
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteMark(mark.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredMarks.length === 0 && (
          <div className="p-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No marks found</p>
            <p className="text-sm text-muted-foreground">
              Create a new test to start tracking marks
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MarksManager;
