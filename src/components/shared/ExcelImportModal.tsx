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
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const store = useTimetableStore();

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
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

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

  const importData = (rows: Record<string, string>[]) => {
    try {
      if (activeTab === "faculty") {
        const imported: Omit<Faculty, "id">[] = rows.map(r => ({
          name: r["Name"] || "",
          email: r["Email"] || "",
          phone: r["Phone"] || "",
          department: r["Department"] || "",
          designation: r["Designation"] || "Lecturer",
          subjectIds: [],
          preferredSlots: [],
          unavailableSlots: [],
          weeklyLoad: parseInt(r["Weekly Load"] || "18") || 18,
          dailyLoad: parseInt(r["Daily Load"] || "4") || 4,
          status: (r["Status"] as Faculty["status"]) || "active",
        }));
        imported.forEach(f => store.addFaculty(f));
        setSuccess(`✓ Successfully imported ${imported.length} faculty members`);

      } else if (activeTab === "subjects") {
        const imported: Omit<Subject, "id">[] = rows.map(r => ({
          name: r["Name"] || "",
          code: r["Code"] || "",
          semester: parseInt(r["Semester"] || "1") || 1,
          division: r["Division"] || "All",
          type: (r["Type"] as Subject["type"]) || "theory",
          lectureCountPerWeek: parseInt(r["Lectures Per Week"] || "3") || 3,
          theoryHours: parseInt(r["Theory Hours"] || "3") || 3,
          labHours: parseInt(r["Lab Hours"] || "0") || 0,
          credits: parseInt(r["Credits"] || "3") || 3,
          labRequired: r["Type"] === "lab",
        }));
        imported.forEach(s => store.addSubject(s));
        setSuccess(`✓ Successfully imported ${imported.length} subjects`);

      } else if (activeTab === "classrooms") {
        const imported: Omit<Classroom, "id">[] = rows.map(r => ({
          roomNumber: r["Room Number"] || "",
          capacity: parseInt(r["Capacity"] || "60") || 60,
          roomType: (r["Room Type"] as Classroom["roomType"]) || "classroom",
          floor: parseInt(r["Floor"] || "1") || 1,
          block: r["Block"] || "",
          equipment: [],
          status: (r["Status"] as Classroom["status"]) || "available",
        }));
        imported.forEach(c => store.addClassroom(c));
        setSuccess(`✓ Successfully imported ${imported.length} classrooms`);

      } else if (activeTab === "semesters") {
        rows.forEach(r => {
          const semNum = parseInt(r["Semester Number"] || "1") || 1;
          const year = parseInt(r["Year"] || "1") || 1;
          const divNames = (r["Division Names (comma-separated)"] || "A").split(",").map(d => d.trim());
          const studentCount = parseInt(r["Student Count Per Division"] || "60") || 60;

          const semId = generateId();
          const divisions: Division[] = divNames.map(name => ({
            id: generateId(),
            name,
            semesterId: semId,
            studentCount,
            subjectIds: [],
          }));

          store.addSemester({ number: semNum, year, isActive: true, divisions });
        });
        setSuccess(`✓ Successfully imported ${rows.length} semesters`);
      }

      toast.success(`Import successful!`);
    } catch {
      setError("An error occurred while saving the data. Please check the file format.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-background border border-border rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Excel Bulk Import
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Import master data from an Excel template</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tab Switcher */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPreview(null); setError(null); setSuccess(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
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
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
            <div>
              <p className="font-semibold text-sm">Step 1: Download Template</p>
              <p className="text-xs text-muted-foreground mt-0.5">Get the exact Excel format required for {activeTab} import</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(activeTab)} className="gap-2 rounded-xl">
              <Download className="w-4 h-4" /> Template
            </Button>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
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
              <div className="overflow-x-auto rounded-xl border border-border text-xs">
                <table className="w-full">
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
                          <td key={j} className="px-3 py-2 whitespace-nowrap">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ExcelImportModal;
