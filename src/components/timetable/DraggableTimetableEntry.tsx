import React from 'react';
import { useDrag } from 'react-dnd';
import { TimetableEntry } from '@/types';

interface DraggableTimetableEntryProps {
  entry: TimetableEntry;
  children: React.ReactNode;
}

export const ItemTypes = {
  TIMETABLE_ENTRY: 'timetableEntry',
};

const DraggableTimetableEntry: React.FC<DraggableTimetableEntryProps> = ({ entry, children }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TIMETABLE_ENTRY,
    item: { id: entry.id, day: entry.day, timeSlotId: entry.timeSlotId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
};

export default DraggableTimetableEntry;
