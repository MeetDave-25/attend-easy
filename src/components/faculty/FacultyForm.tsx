import { useForm } from "react-hook-form";
import { Faculty } from "@/types";
import { useTimetableStore } from "@/store/timetableStore";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, DESIGNATIONS } from "@/lib/utils";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";

interface FacultyFormProps {
  initialData?: Faculty;
  onSuccess: () => void;
  onCancel: () => void;
}

const FacultyForm = ({ initialData, onSuccess, onCancel }: FacultyFormProps) => {
  const { addFaculty, updateFaculty, subjects, timeSlots } = useTimetableStore();
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<Faculty>({
    defaultValues: initialData || {
      name: "",
      email: "",
      department: "",
      designation: "",
      subjectIds: [],
      preferredSlots: [],
      unavailableSlots: [],
      weeklyLoad: 16,
      dailyLoad: 4,
      type: "permanent",
      status: "active",
    },
  });

  const department = watch("department");
  const designation = watch("designation");
  const status = watch("status");
  const facultyType = watch("type");
  const subjectIds = watch("subjectIds");

  const onSubmit = (data: Faculty) => {
    if (initialData) {
      updateFaculty(initialData.id, data);
      toast.success("Faculty updated successfully");
    } else {
      addFaculty(data);
      toast.success("Faculty added successfully");
    }
    onSuccess();
  };

  const toggleSubject = (subjectId: string) => {
    const current = [...subjectIds];
    const index = current.indexOf(subjectId);
    if (index === -1) {
      current.push(subjectId);
    } else {
      current.splice(index, 1);
    }
    setValue("subjectIds", current);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            {...register("name", { required: "Name is required" })} 
            placeholder="Dr. John Doe"
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            {...register("email", { required: "Email is required" })} 
            placeholder="john.doe@college.edu"
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Department</Label>
          <Select 
            value={department} 
            onValueChange={(val) => setValue("department", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Designation</Label>
          <Select 
            value={designation} 
            onValueChange={(val) => setValue("designation", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select designation" />
            </SelectTrigger>
            <SelectContent>
              {DESIGNATIONS.map((desig) => (
                <SelectItem key={desig} value={desig}>{desig}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Faculty Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["permanent", "visiting"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("type", t)}
                className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-all capitalize ${
                  facultyType === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
            <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
            {facultyType === "visiting"
              ? <span><strong className="text-foreground">Hard limit:</strong> Visiting faculty will never exceed their weekly limit. Extra lectures are skipped.</span>
              : <span><strong className="text-foreground">Soft limit:</strong> Permanent faculty prefer not to exceed their limit but can if needed.</span>
            }
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weeklyLoad">Weekly Lecture Limit</Label>
          <Input 
            id="weeklyLoad" 
            type="number" 
            {...register("weeklyLoad", { required: true, min: 1, max: 60 })} 
          />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select 
            value={status} 
            onValueChange={(val: any) => setValue("status", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <Label>Subjects Can Teach</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-muted/30 rounded-xl border border-border">
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 col-span-full text-center">No subjects found. Please add subjects first.</p>
          ) : (
            subjects.map((subject) => {
              const isSelected = subjectIds.includes(subject.id);
              return (
                <div 
                  key={subject.id}
                  onClick={() => toggleSubject(subject.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-background hover:bg-muted border-border'}`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">Sem {subject.semester} • Div {subject.division}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient">
          {initialData ? "Update Faculty" : "Add Faculty"}
        </Button>
      </div>
    </form>
  );
};

export default FacultyForm;
