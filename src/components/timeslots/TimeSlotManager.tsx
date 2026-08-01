import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { TimeSlot } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { generateDefaultTimeSlots } from "@/lib/scheduler";
import { formatTime } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TimeSlotManager = () => {
  const { timeSlots, collegeConfig, setTimeSlots, addTimeSlot, deleteTimeSlot } = useTimetableStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<TimeSlot>>({
    day: collegeConfig.workingDays[0], startTime: "09:00", endTime: "10:00", slotType: "lecture", order: 99
  });

  const handleGenerateDefault = () => {
    if (confirm("This will replace all existing time slots with the defaults generated from College Settings. Continue?")) {
      const defaultSlots = generateDefaultTimeSlots(collegeConfig);
      // Map to full TimeSlot type with IDs
      const fullSlots = defaultSlots.map(s => ({ ...s, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }));
      setTimeSlots(fullSlots);
      toast.success(`Generated ${fullSlots.length} default time slots`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTimeSlot(formData as Omit<TimeSlot, 'id'>);
    toast.success("Time slot added");
    setIsFormOpen(false);
  };

  // Group slots by day
  const slotsByDay: Record<string, TimeSlot[]> = {};
  collegeConfig.workingDays.forEach(day => slotsByDay[day] = []);
  
  timeSlots.forEach(slot => {
    if (slotsByDay[slot.day]) {
      slotsByDay[slot.day].push(slot);
    }
  });

  // Sort each day's slots by order or start time
  Object.keys(slotsByDay).forEach(day => {
    slotsByDay[day].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.startTime.localeCompare(b.startTime);
    });
  });

  const getSlotColor = (type: string) => {
    switch(type) {
      case 'lecture': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'lab': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'break': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'lunch': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="section-title">Lecture Slots</h2>
          <p className="section-subtitle">Configure daily timetable slots and breaks.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleGenerateDefault} variant="outline" className="gap-2 flex-1 sm:flex-none">
            <RotateCcw className="w-4 h-4" /> Auto-Generate
          </Button>
          <Button onClick={() => setIsFormOpen(true)} variant="gradient" className="gap-2 flex-1 sm:flex-none">
            <Plus className="w-4 h-4" /> Custom Slot
          </Button>
        </div>
      </div>

      {timeSlots.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold mb-2">No Time Slots Configured</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Generate standard slots based on your college working hours, or add them manually.
          </p>
          <Button onClick={handleGenerateDefault} variant="gradient" size="lg">
            Generate Default Slots
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {collegeConfig.workingDays.map((day) => (
            <div key={day} className="glass-card rounded-2xl overflow-hidden">
              <div className="bg-secondary/30 p-4 border-b border-border">
                <h3 className="font-bold text-lg">{day}</h3>
                <p className="text-sm text-muted-foreground">{slotsByDay[day]?.length || 0} slots configured</p>
              </div>
              <div className="p-4 space-y-3">
                {slotsByDay[day]?.map((slot, idx) => (
                  <div key={slot.id} className={`flex items-center justify-between p-3 rounded-xl border ${getSlotColor(slot.slotType)} transition-colors`}>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-semibold opacity-70 w-6">{idx + 1}</div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mt-0.5">
                          {slot.slotType}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTimeSlot(slot.id)} className="h-8 w-8 hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!slotsByDay[day] || slotsByDay[day].length === 0) && (
                  <div className="text-center p-6 border border-dashed rounded-xl border-border text-muted-foreground text-sm">
                    No slots configured for this day
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Slot</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Day</Label>
                <Select value={formData.day} onValueChange={v => setFormData({...formData, day: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {collegeConfig.workingDays.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Time (HH:MM)</Label>
                <Input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time (HH:MM)</Label>
                <Input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Slot Type</Label>
                <Select value={formData.slotType} onValueChange={v => setFormData({...formData, slotType: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture (Theory)</SelectItem>
                    <SelectItem value="lab">Laboratory (Practical)</SelectItem>
                    <SelectItem value="break">Short Break</SelectItem>
                    <SelectItem value="lunch">Lunch Break</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient">Add Slot</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeSlotManager;
