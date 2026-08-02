import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { useTimetableStore } from "@/store/timetableStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Faculty, Subject, Classroom, Semester, Division } from "@/types";
import { generateId } from "@/lib/utils";
import {
  Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Download, Loader2
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = "faculty" | "subjects" | "classrooms" | "semesters";
type ExcelCell = string | number | boolean | Date | null | undefined;
type ExcelRow = Record<string, ExcelCell>;

const normalizeHeader = (header: string) =>
  header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeCell = (value: ExcelCell) => String(value ?? "").trim();

const normalizeRows = (rows: ExcelRow[]) => rows.map((row) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]))
);

const readCell = (row: Record<string, ExcelCell>, aliases: string[], fallback = "") => {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    const text = normalizeCell(value);
    if (text) return text;
  }
  return fallback;
};

const readNumber = (row: Record<string, ExcelCell>, aliases: string[], fallback: number) => {
  const value = Number(readCell(row, aliases));
  return Number.isFinite(value) ? value : fallback;
};

const normalizeStatus = (value: string, allowed: string[], fallback: string) => {
  const normalized = value.toLowerCase().replace(/\s+/g, "-");
  return allowed.includes(normalized) ? normalized : fallback;
};

const normalizeRoomType = (value: string): Classroom["roomType"] => {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "lab" || normalized === "laboratory") return "lab";
  if (normalized === "seminarhall" || normalized === "seminar") return "seminar_hall";
  return "classroom";
};

const normalizeSubjectType = (value: string): Subject["type"] => {
  const normalized = value.toLowerCase().trim();
  if (normalized === "lab" || normalized === "laboratory" || normalized === "practical") return "lab";
  if (normalized === "seminar") return "seminar";
  return "theory";
};

const TEMPLATES: Record<ImportMode, { headers: string[]; sample: Record<string, string>[] }> = {
  faculty: {
    headers: ["Name", "Email", "Phone", "Department", "Designation", "Weekly Load", "Daily Load", "Status"],
    sample: [
      {
        Name: "Dr. Ramesh Kumar",
        Email: "ramesh.kumar@college.edu",
        Phone: "9876543210",
        Department: "Computer Science",
        Designation: "Professor",
        "Weekly Load": "18",
        "Daily Load": "4",
        Status: "active",
      },
      {
        Name: "Prof. Sunita Sharma",
        Email: "sunita.sharma@college.edu",
        Phone: "9123456780",
        Department: "Mathematics",
        Designation: "Associate Professor",
        "Weekly Load": "16",
        "Daily Load": "4",
        Status: "active",
      },
    ],
  },
  subjects: {
    headers: ["Name", "Code", "Semester", "Division", "Type", "Lectures Per Week", "Theory Hours", "Lab Hours", "Credits"],
    sample: [
      {
        Name: "Data Structures",
        Code: "CS301",
        Semester: "3",
        Division: "A",
        Type: "theory",
        "Lectures Per Week": "4",
        "Theory Hours": "4",
        "Lab Hours": "0",
        Credits: "4",
      },
      {
        Name: "Data Structures Lab",
        Code: "CS302",
        Semester: "3",
        Division: "A",
        Type: "lab",
        "Lectures Per Week": "2",
        "Theory Hours": "0",
        "Lab Hours": "4",
        Credits: "2",
      },
    ],
  },
  classrooms: {
    headers: ["Room Number", "Capacity", "Room Type", "Floor", "Block", "Status"],
    sample: [
      {
        "Room Number": "CS-101",
        Capacity: "60",
        "Room Type": "classroom",
        Floor: "1",
        Block: "A",
        Status: "available",
      },
      {
        "Room Number": "CS-Lab-1",
        Capacity: "30",
        "Room Type": "lab",
        Floor: "2",
        Block: "B",
        Status: "available",
      },
    ],
  },
  semesters: {
    headers: ["Semester Number", "Year", "Division Names (comma-separated)", "Student Count Per Division"],
    sample: [
      {
        "Semester Number": "3",
        Year: "2",
        "Division Names (comma-separated)": "A,B,C",
        "Student Count Per Division": "60",
      },
    ],
  },
};

const TABS: { id: ImportMode; label: string; color: string }[] = [
  { id: "faculty", label: "Faculty", color: "bg-blue-500" },
  { id: "subjects", label: "Subjects", color: "bg-purple-500" },
  { id: "classrooms", label: "Classrooms", color: "bg-green-500" },
  { id: "semesters", label: "Semesters", color: "bg-amber-500" },
];

const ExcelImportModal = ({ isOpen, onClose }: ImportModalProps) => {
  const [activeTab, setActiveTab] = useState<ImportMode>("faculty");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ExcelRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = (mode: ImportMode) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(TEMPLATES[mode].sample);
    XLSX.utils.book_append_sheet(wb, ws, mode);
    XLSX.writeFile(wb, `${mode}_template.xlsx`);
    toast.success(`${mode} template downloaded`);
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccess(null);
    setPreview(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });

        if (rows.length === 0) {
          setError("The file is empty or has no data rows.");
          setIsProcessing(false);
          return;
        }

        setPreview(rows.slice(0, 3)); // Show first 3 rows as preview
        importData(rows);
      } catch {
        setError("Failed to parse the Excel file. Please use the correct template.");
      }
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const importData = (rows: ExcelRow[]) => {
    try {
      const normalizedRows = normalizeRows(rows).filter((row) =>
        Object.values(row).some((value) => normalizeCell(value))
      );
      const importStamp = Date.now();

      if (normalizedRows.length === 0) {
        throw new Error("The file contains no usable data rows.");
      }

      if (activeTab === "faculty") {
        const imported: Omit<Faculty, "id">[] = normalizedRows.map((r, index) => ({
          name: readCell(r, ["Name", "Faculty Name", "Teacher Name"]),
          email: readCell(r, ["Email", "Email ID", "Faculty Email"], `imported.faculty.${importStamp}.${index + 1}@local.invalid`),
          phone: readCell(r, ["Phone", "Phone Number", "Mobile"]),
          department: readCell(r, ["Department", "Dept"], "General"),
          designation: readCell(r, ["Designation", "Role"], "Lecturer"),
          subjectIds: [],
          preferredSlots: [],
          unavailableSlots: [],
          weeklyLoad: readNumber(r, ["Weekly Load", "Weekly Lectures", "Max Lectures Per Week"], 18),
          dailyLoad: readNumber(r, ["Daily Load", "Daily Lectures", "Max Lectures Per Day"], 4),
          status: normalizeStatus(readCell(r, ["Status"]), ["active", "inactive", "on-leave"], "active") as Faculty["status"],
        }));
        if (imported.some((faculty) => !faculty.name)) throw new Error("Faculty Name is required.");
        useTimetableStore.getState().addFacultyMany(imported);
        setSuccess(`✓ Successfully imported ${imported.length} faculty members`);

      } else if (activeTab === "subjects") {
        const imported: Omit<Subject, "id">[] = normalizedRows.map((r, index) => {
          const type = normalizeSubjectType(readCell(r, ["Type", "Subject Type"]));
          return {
            name: readCell(r, ["Name", "Subject Name"]),
            code: readCell(r, ["Code", "Subject Code"], `IMPORTED-${importStamp}-${index + 1}`),
            semester: readNumber(r, ["Semester", "Semester Number", "Sem"], 1),
            division: readCell(r, ["Division", "Div"], "All"),
            type,
            lectureCountPerWeek: readNumber(r, ["Lectures Per Week", "Lecture Count Per Week", "Weekly Lectures"], 3),
            theoryHours: readNumber(r, ["Theory Hours"], 3),
            labHours: readNumber(r, ["Lab Hours"], 0),
            credits: readNumber(r, ["Credits"], 3),
            labRequired: type === "lab",
          };
        });
        if (imported.some((subject) => !subject.name)) throw new Error("Subject Name is required.");
        useTimetableStore.getState().addSubjectMany(imported);
        setSuccess(`✓ Successfully imported ${imported.length} subjects`);

      } else if (activeTab === "classrooms") {
        const imported: Omit<Classroom, "id">[] = normalizedRows.map((r, index) => ({
          roomNumber: readCell(r, ["Room Number", "Room No", "Room", "Classroom"], `Imported Room ${index + 1}`),
          capacity: readNumber(r, ["Capacity", "Student Capacity"], 60),
          roomType: normalizeRoomType(readCell(r, ["Room Type", "Type"])),
          floor: readNumber(r, ["Floor"], 1),
          block: readCell(r, ["Block", "Building"]),
          equipment: [],
          status: normalizeStatus(readCell(r, ["Status"]), ["available", "maintenance", "occupied"], "available") as Classroom["status"],
        }));
        useTimetableStore.getState().addClassroomMany(imported);
        setSuccess(`✓ Successfully imported ${imported.length} classrooms`);

      } else if (activeTab === "semesters") {
        const imported: Omit<Semester, "id">[] = normalizedRows.map((r) => {
          const semNum = readNumber(r, ["Semester Number", "Semester", "Sem"], 1);
          const year = readNumber(r, ["Year", "Academic Year"], 1);
          const divNames = readCell(r, ["Division Names (comma-separated)", "Division Names", "Divisions"], "A")
            .split(",").map((division) => division.trim()).filter(Boolean);

          const semId = generateId();
          const divisions: Division[] = divNames.map((name) => ({
            id: generateId(), name, semesterId: semId,
            studentCount: readNumber(r, ["Student Count Per Division", "Student Count", "Students"], 60),
            subjectIds: [],
          }));
          return { number: semNum, year, isActive: true, divisions };
        });
        useTimetableStore.getState().addSemesterMany(imported);
        setSuccess(`✓ Successfully imported ${rows.length} semesters`);
      }

      toast.success(`Import successful! ${normalizedRows.length} row${normalizedRows.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while saving the data. Please check the file format.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative my-auto flex w-full min-w-0 max-w-3xl max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-primary/5 to-purple-500/5 p-4 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="truncate">Excel Bulk Import</span>
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">Import master data from an Excel template</p>
          </div>
          <button onClick={onClose} aria-label="Close Excel import" className="shrink-0 rounded-xl p-2 transition-colors hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {/* Tab Switcher */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPreview(null); setError(null); setSuccess(null); }}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "gradient-primary text-white shadow-md"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Template Download */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Step 1: Download Template</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Get the exact Excel format required for {activeTab} import</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(activeTab)} className="w-full shrink-0 gap-2 rounded-xl sm:w-auto">
              <Download className="w-4 h-4" /> Template
            </Button>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-300 sm:p-10 ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
            />
            <div className="flex flex-col items-center gap-3">
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : (
                <Upload className={`w-10 h-10 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              )}
              <div>
                <p className="font-semibold">
                  {isProcessing ? "Processing..." : "Step 2: Drop your Excel file here"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse (.xlsx, .xls, .csv)</p>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-muted-foreground">Preview (first 3 rows):</p>
              <div className="max-w-full overflow-x-auto rounded-xl border border-border text-xs">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="bg-muted/50">
                      {Object.keys(preview[0]).map(k => (
                        <th key={k} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-2 whitespace-nowrap">{normalizeCell(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-background/95 p-4 backdrop-blur-sm">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
          <Button variant="gradient" onClick={onClose} className="rounded-xl">
            Done
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ExcelImportModal;
