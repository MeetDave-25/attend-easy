import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTimetableStore } from '@/store/timetableStore';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateTimetable } from '@/lib/scheduler';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import ConflictPanel from './ConflictPanel';
import { CheckCircle2, AlertTriangle, RotateCcw, Calendar as CalendarIcon, Download } from 'lucide-react';

const TimetableWizard = () => {
  const [step, setStep] = useState(1);
  const [generationMode, setGenerationMode] = useState<'daily' | 'weekly'>('weekly');
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const navigate = useNavigate();

  const {
    collegeConfig,
    faculty,
    subjects,
    classrooms,
    semesters,
    timeSlots,
    leaveEntries,
    isGenerating,
    setIsGenerating,
    setTimetableEntries,
    setGenerationResult,
    setConflicts,
    addNotification,
    generationResult,
    conflicts,
  } = useTimetableStore();

  const handleGenerate = () => {
    if (generationMode === 'daily' && !selectedDay) {
      toast.error('Please select a day to generate.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusText("Preparing generation...");

    // Simulate progress for UI feel
    const intervals = [
      { p: 20, t: "Reading subjects, rooms and teachers..." },
      { p: 40, t: "Placing every required class..." },
      { p: 60, t: "Respecting leave and room availability..." },
      { p: 80, t: "Checking for clashes..." },
      { p: 95, t: "Balancing the timetable..." }
    ];

    let delay = 0;
    intervals.forEach(({ p, t }) => {
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
          leaveEntries,
          dayFilter: generationMode === 'daily' ? selectedDay : undefined,
        });

        setProgress(100);
        setStatusText("Complete!");

        if (generationMode === 'daily') {
          // Merge results
          const otherEntries = useTimetableStore.getState().timetableEntries.filter(e => e.day !== selectedDay);
          setTimetableEntries([...otherEntries, ...result.entries]);
        } else {
          setTimetableEntries(result.entries);
        }
        setGenerationResult(result);
        setConflicts(result.conflicts);

        if (result.success) {
          addNotification({
            type: "timetable_published",
            title: "Timetable updated",
            message: `A new timetable for ${generationMode === 'daily' ? selectedDay : 'the week'} is now available.`,
            forRole: "all",
          });
          toast.success(`Timetable generated successfully for ${generationMode === 'daily' ? selectedDay : 'the week'}!`);
        } else {
          const errors = result.conflicts.filter(c => c.severity === 'error').length;
          toast.error(`Timetable could not be generated. Please fix ${errors} issue(s) and try again.`);
        }
      } catch (err: any) {
        toast.error(`Generation failed: ${err.message}`);
        setGenerationResult(null);
      } finally {
        setTimeout(() => {
          setIsGenerating(false);
          setStep(3); // Go to a new results step
        }, 500);
      }
    }, delay + 600);
  };

  const handleStartOver = () => {
    setStep(1);
    setGenerationResult(null);
    setConflicts([]);
  }

  if (isGenerating) {
    return (
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
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="text-center space-y-4 mb-10">
        <h2 className="text-4xl font-bold tracking-tight">Timetable Generation Wizard</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A step-by-step guide to generating your college timetable.
        </p>
      </div>

      {step === 1 && (
        <div>
          <h3 className="text-2xl font-bold">Step 1: Select Generation Mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div
              className={`p-6 border rounded-lg cursor-pointer ${
                generationMode === 'weekly' ? 'border-primary' : ''
              }`}
              onClick={() => setGenerationMode('weekly')}
            >
              <h4 className="font-bold">Full Week Generation</h4>
              <p className="text-sm text-muted-foreground">
                Generate the timetable for the entire week at once. This is the recommended approach.
              </p>
            </div>
            <div
              className={`p-6 border rounded-lg cursor-pointer ${
                generationMode === 'daily' ? 'border-primary' : ''
              }`}
              onClick={() => setGenerationMode('daily')}
            >
              <h4 className="font-bold">Day-by-Day Generation</h4>
              <p className="text-sm text-muted-foreground">
                Generate the timetable for a single day. Useful for making small adjustments.
              </p>
            </div>
          </div>
          {generationMode === 'daily' && (
            <div className="mt-4">
              <label htmlFor="day-select" className="block text-sm font-medium text-gray-700">
                Select Day
              </label>
              <Select onValueChange={setSelectedDay} value={selectedDay}>
                <SelectTrigger id="day-select">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {collegeConfig.workingDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="mt-8 flex justify-end">
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-2xl font-bold">Step 2: Review & Generate</h3>
          <p className="mt-4">
            You have selected <strong>{generationMode}</strong> generation.
            {generationMode === 'daily' && selectedDay && ` for ${selectedDay}`}
          </p>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
        </div>
      )}

      {step === 3 && generationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="glass-card p-8 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 md:col-span-3 border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                {generationResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                )}
                <h3 className="text-2xl font-bold">
                  {generationResult.success ? "Generation Complete" : "Generation Blocked"}
                </h3>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleStartOver} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Start Over
                </Button>
                {generationResult.success && (
                  <Button variant="gradient" onClick={() => navigate("/app/timetable")} className="gap-2">
                    <CalendarIcon className="w-4 h-4" /> View Timetable
                  </Button>
                )}
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
              <p className={`text-4xl font-bold mb-2 ${conflicts.filter(c => c.severity === 'error').length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {conflicts.filter(c => c.severity === 'error').length}
              </p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Errors</p>
            </div>
          </div>

          {(conflicts.length > 0) && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Conflict Resolution Required</h3>
              <ConflictPanel conflicts={conflicts} />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TimetableWizard;

