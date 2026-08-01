import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, File, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Subject, Student, TestMark } from "@/types";
import { cn } from "@/lib/utils";

interface DataExportProps {
  subjects: Subject[];
  students: Student[];
  marks: TestMark[];
  attendanceData: Record<string, Record<string, boolean>>;
}

const exportOptions = [
  {
    id: "attendance",
    label: "Attendance Report",
    description: "Subject-wise attendance summary for all students",
    icon: FileSpreadsheet,
  },
  {
    id: "marks",
    label: "Marks Report",
    description: "Test-wise marks for all students",
    icon: FileText,
  },
  {
    id: "combined",
    label: "Combined Report",
    description: "Complete attendance and marks in one file",
    icon: File,
  },
];

const DataExport = ({ subjects, students, marks, attendanceData }: DataExportProps) => {
  const [selectedExport, setSelectedExport] = useState<string[]>([]);
  const [format, setFormat] = useState<string>("csv");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const toggleExport = (id: string) => {
    setSelectedExport((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const generateCSV = (data: Record<string, any>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const handleExport = async () => {
    setIsExporting(true);

    // Filter students by year
    const filteredStudents =
      selectedYear === "all"
        ? students
        : students.filter((s) => s.year.toString() === selectedYear);

    // Filter subjects
    const filteredSubjects =
      selectedSubject === "all"
        ? subjects
        : subjects.filter((s) => s.id === selectedSubject);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (selectedExport.includes("attendance")) {
      const attendanceReport = filteredStudents.map((student) => {
        const row: Record<string, any> = {
          Name: student.name,
          "Roll Number": student.rollNumber,
          Year: student.year,
        };

        filteredSubjects.forEach((subject) => {
          const isPresent = attendanceData[student.id]?.[subject.id];
          row[subject.code] = isPresent ? "Present" : "Absent";
        });

        const totalPresent = filteredSubjects.filter(
          (subject) => attendanceData[student.id]?.[subject.id]
        ).length;
        row["Total Present"] = totalPresent;
        row["Percentage"] = `${Math.round(
          (totalPresent / filteredSubjects.length) * 100
        )}%`;

        return row;
      });

      generateCSV(attendanceReport, "attendance_report");
    }

    if (selectedExport.includes("marks")) {
      const marksReport = filteredStudents.map((student) => {
        const row: Record<string, any> = {
          Name: student.name,
          "Roll Number": student.rollNumber,
          Year: student.year,
        };

        const studentMarks = marks.filter(
          (m) =>
            m.studentId === student.id &&
            (selectedSubject === "all" || m.subjectId === selectedSubject)
        );

        studentMarks.forEach((mark) => {
          const subject = subjects.find((s) => s.id === mark.subjectId);
          row[`${subject?.code || "N/A"} - ${mark.testName}`] =
            `${mark.obtainedMarks}/${mark.maxMarks}`;
        });

        return row;
      });

      generateCSV(marksReport, "marks_report");
    }

    if (selectedExport.includes("combined")) {
      const combinedReport = filteredStudents.map((student) => {
        const row: Record<string, any> = {
          Name: student.name,
          "Roll Number": student.rollNumber,
          Email: student.email,
          Year: student.year,
        };

        // Attendance
        filteredSubjects.forEach((subject) => {
          const isPresent = attendanceData[student.id]?.[subject.id];
          row[`Attendance - ${subject.code}`] = isPresent ? "P" : "A";
        });

        // Marks
        const studentMarks = marks.filter(
          (m) =>
            m.studentId === student.id &&
            (selectedSubject === "all" || m.subjectId === selectedSubject)
        );

        studentMarks.forEach((mark) => {
          const subject = subjects.find((s) => s.id === mark.subjectId);
          row[`Marks - ${subject?.code || "N/A"} - ${mark.testName}`] =
            `${mark.obtainedMarks}/${mark.maxMarks}`;
        });

        return row;
      });

      generateCSV(combinedReport, "combined_report");
    }

    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-6 rounded-2xl shadow-card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl gradient-primary">
            <Download className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Export Data</h2>
            <p className="text-sm text-muted-foreground">
              Download attendance and marks reports
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                <SelectItem value="pdf" disabled>
                  PDF (Coming Soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue />
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
          </div>
        </div>

        {/* Export Options */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedExport.includes(option.id);

            return (
              <motion.button
                key={option.id}
                onClick={() => toggleExport(option.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "p-6 rounded-xl border-2 text-left transition-all relative",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <Icon
                  className={cn(
                    "w-8 h-8 mb-3",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <p className="font-semibold">{option.label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={selectedExport.length === 0 || isExporting}
          className="w-full md:w-auto gradient-primary border-0"
        >
          {isExporting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Download className="w-4 h-4" />
              </motion.div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Selected ({selectedExport.length})
            </>
          )}
        </Button>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card p-6 rounded-2xl shadow-card"
      >
        <h3 className="font-semibold mb-4">Data Summary</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-xl bg-secondary">
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary">
            <p className="text-2xl font-bold">{subjects.length}</p>
            <p className="text-sm text-muted-foreground">Subjects</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary">
            <p className="text-2xl font-bold">{marks.length}</p>
            <p className="text-sm text-muted-foreground">Test Entries</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary">
            <p className="text-2xl font-bold">
              {Object.keys(attendanceData).length}
            </p>
            <p className="text-sm text-muted-foreground">Attendance Records</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DataExport;
