import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import { generateTimetable } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle2, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConflictPanel from "./ConflictPanel";

const TimetableGeneratorV2 = () => {
  const navigate = useNavigate();
  const store = useTimetableStore();
  const { 
    collegeConfig, faculty, subjects, classrooms, semesters, timeSlots, leaveEntries,
    isGenerating, setIsGenerating, setTimetableEntries, setGenerationResult, setConflicts,
    generationResult, conflicts, timetableEntries
  } = store;

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const handleGenerate = () => {
    // Validation
    if (!collegeConfig.isConfigured) return toast.error("Please configure college settings first");
    if (faculty.length === 0) return toast.error("Add at least one faculty member");
    if (subjects.length === 0) return toast.error("Add at least one subject");
    if (classrooms.length === 0) return toast.error("Add at least one classroom");
    if (semesters.length === 0) return toast.error("Add at least one semester");
    if (timeSlots.length === 0) return toast.error("Configure time slots first");

    setIsGenerating(true);
    setProgress(0);
    setStatusText("Initializing scheduling engine...");

    // Simulate progress for UI feel
    const intervals = [
      { p: 20, t: "Loading constraints..." },
      { p: 40, t: "Assigning labs & practicals..." },
      { p: 60, t: "Scheduling theory lectures..." },
      { p: 80, t: "Checking conflicts..." },
      { p: 95, t: "Optimizing layout..." }
    ];

    let delay = 0;
    intervals.forEach(({ p, t }, index) => {
      delay += 400;
      setTimeout(() => {
        if (useTimetableStore.getState().isGenerating) {
          setProgress(p);
          setStatusText(t);
        }
      }, delay);
    });

    setTimeout(() => {
      try {
        const result = generateTimetable({
          config: collegeConfig,
          faculty,
          subjects,
          classrooms,
          semesters,
          timeSlots,
          leaveEntries
        });

        setProgress(100);
        setStatusText("Complete!");
        
        setGenerationResult(result);
        setTimetableEntries(result.entries);
        setConflicts(result.conflicts);
        
        if (result.success) {
          toast.success("Timetable generated successfully with ZERO conflicts!");
        } else {
          const errors = result.conflicts.filter(c => c.severity === 'error').length;
          toast.warning(`Timetable generated with ${errors} conflicts. Review needed.`);
        }
      } catch (err: any) {
        toast.error(`Generation failed: ${err.message}`);
        setGenerationResult(null);
      } finally {
        setTimeout(() => setIsGenerating(false), 500);
      }
    }, delay + 600);
  };

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight">Smart Generator</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Automatically create conflict-free schedules using AI-powered constraint satisfaction algorithms.
        </p>
      </div>

      {isGenerating ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 rounded-3xl text-center space-y-8 max-w-xl mx-auto"
        >
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Generating Timetable...</h3>
            <p className="text-muted-foreground">{statusText}</p>
            <Progress value={progress} className="h-2 w-full bg-secondary" />
          </div>
        </motion.div>
      ) : generationResult ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Results Summary */}
          <div className="glass-card p-8 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 md:col-span-3 border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                {generationResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                )}
                <h3 className="text-2xl font-bold">
                  {generationResult.success ? "Generation Successful" : "Generated with Conflicts"}
                </h3>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleGenerate} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Regenerate
                </Button>
                <Button variant="gradient" onClick={() => navigate("/app/timetable")} className="gap-2">
                  <CalendarIcon className="w-4 h-4" /> View Timetable
                </Button>
              </div>
            </div>

            <div className="text-center p-6 bg-secondary/30 rounded-2xl">
              <p className="text-4xl font-bold mb-2">{generationResult.stats.totalEntries}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Lectures</p>
            </div>
            <div className="text-center p-6 bg-secondary/30 rounded-2xl">
              <p className="text-4xl font-bold mb-2">{generationResult.stats.roomsUsed}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rooms Utilized</p>
            </div>
            <div className="text-center p-6 bg-secondary/30 rounded-2xl">
              <p className={`text-4xl font-bold mb-2 ${errorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {errorCount}
              </p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Errors</p>
            </div>
          </div>

          {/* Conflict Panel */}
          {(errorCount > 0 || warningCount > 0) && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Conflict Resolution Required</h3>
              <ConflictPanel conflicts={conflicts} />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-10 rounded-3xl text-center max-w-xl mx-auto space-y-8 shadow-xl border-primary/20 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 space-y-6">
             <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mb-8">
               <div className="bg-background/80 p-4 rounded-xl border border-border">
                 <p className="text-xs text-muted-foreground font-semibold uppercase">Constraints</p>
                 <p className="text-2xl font-bold mt-1">12+</p>
               </div>
               <div className="bg-background/80 p-4 rounded-xl border border-border">
                 <p className="text-xs text-muted-foreground font-semibold uppercase">Engine</p>
                 <p className="text-2xl font-bold mt-1">CSP</p>
               </div>
             </div>
             
             <Button 
              size="xl" 
              variant="gradient" 
              className="w-full text-lg shadow-primary/30 shadow-lg hover:shadow-primary/40 hover:-translate-y-1"
              onClick={handleGenerate}
             >
               <Zap className="w-5 h-5 mr-2 fill-current" />
               Start Generation Engine
             </Button>

             <div className="flex gap-4 pt-4">
               <Button variant="outline" className="flex-1 border-primary/20 text-primary hover:bg-primary/10" onClick={() => { store.loadDummyData(); toast.success("Dummy data loaded successfully!"); }}>
                 Load Dummy Data
               </Button>
               <Button variant="outline" className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => { store.clearData(); toast.success("All data cleared!"); }}>
                 Clear All Data
               </Button>
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TimetableGeneratorV2;
