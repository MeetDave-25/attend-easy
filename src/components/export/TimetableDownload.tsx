import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimetableStore } from "@/store/timetableStore";
import { downloadTimetableCsv } from "@/lib/timetableExport";

const TimetableDownload = () => {
  const { timetableEntries, subjects, faculty, classrooms, semesters, conflicts } = useTimetableStore();
  const hasErrors = conflicts.some(conflict => conflict.severity === "error");

  if (timetableEntries.length === 0 || hasErrors) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-card rounded-3xl border border-border shadow-sm">
        <FileText className="w-14 h-14 text-muted-foreground/40 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No conflict-free timetable available</h2>
        <p className="text-muted-foreground max-w-md">Generate and resolve the timetable first. Downloads are enabled only after a complete conflict-free schedule is ready.</p>
      </div>
    );
  }

  const downloadCsv = () => downloadTimetableCsv(timetableEntries, subjects, faculty, classrooms, semesters);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="section-title">Downloads & Export</h2>
        <p className="section-subtitle">Download the verified timetable for sharing or printing.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <Download className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Timetable ready</h3>
            <p className="text-sm text-muted-foreground">{timetableEntries.length} lectures · zero conflicts</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="gradient" onClick={downloadCsv} className="gap-2">
            <Download className="w-4 h-4" /> Download CSV / Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <FileText className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimetableDownload;
