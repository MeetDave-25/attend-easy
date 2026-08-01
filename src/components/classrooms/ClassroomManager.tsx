import { useState } from "react";
import { useTimetableStore } from "@/store/timetableStore";
import { Classroom } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROOM_TYPES, STATUS_COLORS } from "@/lib/utils";

const ClassroomManager = () => {
  const { classrooms, addClassroom, updateClassroom, deleteClassroom } = useTimetableStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | undefined>();
  const [formData, setFormData] = useState<Partial<Classroom>>({
    roomNumber: "", capacity: 60, roomType: "classroom", equipment: [], status: "available", floor: 1
  });

  const filteredRooms = classrooms.filter(
    (r) => r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openForm = (room?: Classroom) => {
    if (room) {
      setEditingRoom(room);
      setFormData(room);
    } else {
      setEditingRoom(undefined);
      setFormData({ roomNumber: "", capacity: 60, roomType: "classroom", equipment: [], status: "available", floor: 1 });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNumber) return toast.error("Room Number is required");
    
    if (editingRoom) {
      updateClassroom(editingRoom.id, formData as Classroom);
      toast.success("Classroom updated successfully");
    } else {
      addClassroom(formData as Omit<Classroom, 'id'>);
      toast.success("Classroom added successfully");
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this classroom?")) {
      deleteClassroom(id);
      toast.success("Classroom deleted");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-title">Classrooms</h2>
          <p className="section-subtitle">Manage physical spaces, labs, and their capacities.</p>
        </div>
        <Button onClick={() => openForm()} variant="gradient" className="gap-2">
          <Plus className="w-4 h-4" /> Add Room
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} className="glass-card rounded-2xl p-6 group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">{room.roomNumber}</h3>
                <Badge variant="outline" className={STATUS_COLORS[room.status]}>
                  {room.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => openForm(room)} className="h-8 w-8 text-blue-500"><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border/50">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Type</span>
                 <span className="font-medium">{ROOM_TYPES[room.roomType]?.label || room.roomType}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Capacity</span>
                 <span className="font-medium">{room.capacity} students</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Floor</span>
                 <span className="font-medium">{room.floor || '-'}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRoom ? 'Edit Classroom' : 'Add Classroom'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Room Number / Name</Label>
                <Input value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Capacity (Students)</Label>
                <Input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Floor (Optional)</Label>
                <Input type="number" value={formData.floor} onChange={e => setFormData({...formData, floor: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Room Type</Label>
                <Select value={formData.roomType} onValueChange={v => setFormData({...formData, roomType: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOM_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="occupied">Occupied (Other Use)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient">Save Room</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassroomManager;
