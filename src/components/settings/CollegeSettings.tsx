import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CollegeSettings = () => {
  const { collegeConfig, updateCollegeConfig } = useTimetableStore();
  const [formData, setFormData] = useState(collegeConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCollegeConfig({ ...formData, isConfigured: true });
    toast.success("College settings saved successfully");
  };

  const toggleDay = (day: string) => {
    const current = [...formData.workingDays];
    const index = current.indexOf(day);
    if (index === -1) {
      current.push(day);
    } else {
      current.splice(index, 1);
    }
    setFormData({ ...formData, workingDays: current });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="section-title">College Settings</h2>
        <p className="section-subtitle">Configure global parameters for the timetable generator.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> General Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label>College Name</Label>
              <Input 
                value={formData.collegeName} 
                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })} 
                placeholder="Enter college name"
              />
            </div>
          </div>
        </div>

        {/* Schedule Constraints */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Timings & Limits</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <Label>College Start Time</Label>
              <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>College End Time</Label>
              <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Lecture Duration (mins)</Label>
              <Input type="number" value={formData.lectureDuration} onChange={(e) => setFormData({ ...formData, lectureDuration: parseInt(e.target.value) })} />
            </div>
            
            <div className="space-y-2">
              <Label>Lunch Start Time</Label>
              <Input type="time" value={formData.lunchBreakStart} onChange={(e) => setFormData({ ...formData, lunchBreakStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Lunch End Time</Label>
              <Input type="time" value={formData.lunchBreakEnd} onChange={(e) => setFormData({ ...formData, lunchBreakEnd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Short Break (mins)</Label>
              <Input type="number" value={formData.shortBreakDuration} onChange={(e) => setFormData({ ...formData, shortBreakDuration: parseInt(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <Label>Max Lectures/Day (Student)</Label>
              <Input type="number" value={formData.maxLecturesPerDay} onChange={(e) => setFormData({ ...formData, maxLecturesPerDay: parseInt(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Max Lectures/Day (Faculty)</Label>
              <Input type="number" value={formData.maxLecturesPerFaculty} onChange={(e) => setFormData({ ...formData, maxLecturesPerFaculty: parseInt(e.target.value) })} />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <Label className="mb-4 block">Working Days</Label>
            <div className="flex flex-wrap gap-4">
              {DAYS.map((day) => {
                const isSelected = formData.workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setFormData(collegeConfig)}>
            Reset Changes
          </Button>
          <Button type="submit" variant="gradient" size="lg" className="gap-2">
            <Save className="w-5 h-5" /> Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CollegeSettings;
