import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  QrCode,
  ClipboardList,
  Calendar,
  CheckCircle2,
  User,
  ArrowLeft,
  BookOpen,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import QRScanner from "@/components/student/QRScanner";
import { cn } from "@/lib/utils";
import { authAPI, attendanceAPI, studentsAPI } from "@/lib/api";
import { useTimetableStore } from "@/store/timetableStore";

type View = "home" | "scan" | "attendance" | "schedule";

interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  year: number;
  semester?: number;
  division?: string;
  email: string;
}

const mockAttendance = [
  { subject: "Data Structures", code: "CS201", percentage: 85, classes: 17, total: 20 },
  { subject: "Algorithms", code: "CS301", percentage: 90, classes: 18, total: 20 },
  { subject: "Database Systems", code: "CS302", percentage: 75, classes: 15, total: 20 },
  { subject: "Operating Systems", code: "CS401", percentage: 80, classes: 16, total: 20 },
];

const StudentPortal = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const [markedSessions, setMarkedSessions] = useState<string[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const {
    setCurrentUser, currentUser, timetableEntries, subjects, classrooms,
    semesters, timeSlots, collegeConfig,
  } = useTimetableStore();
  const authUser = currentUser || authAPI.getCurrentUser();
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const [selectedDay, setSelectedDay] = useState(todayName);

  useEffect(() => {
    let isActive = true;
    if (!authUser?.studentId) {
      setStudentProfile(null);
      setProfileError("Your account is not linked to a student profile yet.");
      return () => { isActive = false; };
    }

    void studentsAPI.getById(authUser.studentId)
      .then((response: any) => {
        if (!isActive) return;
        const student = response.data;
        setStudentProfile({
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber || student.roll_number,
          year: student.year,
          semester: student.semester,
          division: student.division,
          email: student.email,
        });
        setProfileError(null);
      })
      .catch(() => {
        if (isActive) setProfileError("Unable to load your student profile.");
      });

    return () => { isActive = false; };
  }, [authUser?.studentId]);

  const availableDays = useMemo(() => {
    const configured = collegeConfig.workingDays.filter((day) => timeSlots.some((slot) => slot.day === day));
    return configured.length > 0 ? configured : Array.from(new Set(timeSlots.map((slot) => slot.day)));
  }, [collegeConfig.workingDays, timeSlots]);

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays.includes(todayName) ? todayName : availableDays[0]);
    }
  }, [availableDays, selectedDay, todayName]);

  const studentSemester = useMemo(() => {
    if (!studentProfile) return undefined;
    const semesterNumber = studentProfile.semester || semesters.find((semester) => semester.year === studentProfile.year)?.number;
    return semesters.find((semester) => semester.number === semesterNumber);
  }, [studentProfile, semesters]);

  const studentDivision = studentSemester?.divisions.find((division) => division.name === studentProfile?.division)
    || studentSemester?.divisions[0];

  const daySlots = useMemo(() => timeSlots
    .filter((slot) => slot.day === selectedDay)
    .sort((left, right) => left.order - right.order || left.startTime.localeCompare(right.startTime)), [timeSlots, selectedDay]);

  const liveEntries = useMemo(() => timetableEntries.filter((entry) =>
    entry.semesterId === studentSemester?.id &&
    entry.divisionId === studentDivision?.id &&
    entry.day === selectedDay
  ), [timetableEntries, studentSemester?.id, studentDivision?.id, selectedDay]);

  const todayEntries = useMemo(() => timetableEntries.filter((entry) =>
    entry.semesterId === studentSemester?.id &&
    entry.divisionId === studentDivision?.id &&
    entry.day === todayName
  ).sort((left, right) => left.startTime.localeCompare(right.startTime)), [timetableEntries, studentSemester?.id, studentDivision?.id, todayName]);

  const nextClass = todayEntries.find((entry) => {
    const [hour, minute] = entry.endTime.split(":").map(Number);
    return hour * 60 + minute >= new Date().getHours() * 60 + new Date().getMinutes();
  }) || todayEntries[0];
  const mockStudent = {
    rollNumber: studentProfile?.rollNumber || "Profile loading",
    year: studentProfile?.year || "—",
  };
  const mockSchedule = daySlots.map((slot) => {
    const entry = liveEntries.find((item) => item.timeSlotId === slot.id);
    const subject = subjects.find((item) => item.id === entry?.subjectId);
    const room = classrooms.find((item) => item.id === entry?.classroomId);
    const isBreak = slot.slotType === "break" || slot.slotType === "lunch";
    return {
      time: slot.startTime,
      subject: isBreak ? (slot.slotType === "lunch" ? "Lunch" : "Break") : subject?.name || "No class",
      room: room?.roomNumber ? `Room ${room.roomNumber}` : "—",
    };
  });

  const handleAttendanceMarked = async (sessionData: any, location: GeolocationCoordinates) => {
    try {
      // Get the current logged-in student
      const user = authAPI.getCurrentUser();
      if (!user || user.role !== 'student') {
        throw new Error('Student authentication required');
      }

      // Call the backend API to mark attendance
      await attendanceAPI.markAttendance({
        sessionId: sessionData.sessionId,
        studentId: user.studentId || user.id,
        locationLat: location.latitude,
        locationLng: location.longitude,
        locationAccuracy: location.accuracy
      });

      console.log("Attendance marked successfully:", sessionData, "Location:", location);
      setMarkedSessions([...markedSessions, sessionData.sessionId]);
    } catch (error: any) {
      console.error('Failed to mark attendance:', error);
      // Re-throw the error so QRScanner can handle it
      throw error;
    }
  };

  const menuItems = [
    {
      id: "scan",
      label: "Scan QR",
      description: "Mark your attendance",
      icon: QrCode,
      color: "gradient-primary"
    },
    {
      id: "attendance",
      label: "My Attendance",
      description: "View attendance records",
      icon: ClipboardList,
      color: "gradient-accent"
    },
    {
      id: "schedule",
      label: "Today's Schedule",
      description: "View your classes",
      icon: Calendar,
      color: "bg-success"
    },
  ];

  const renderHome = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="gradient-hero p-6 rounded-2xl text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm opacity-80">Welcome back,</p>
            <h1 className="text-2xl font-bold">{studentProfile?.name || authUser?.name || "Student"}</h1>
            <p className="text-sm opacity-80">
              {mockStudent.rollNumber} • Year {mockStudent.year}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-card shadow-card"
        >
          <p className="text-sm text-muted-foreground">Overall Attendance</p>
          <p className="text-3xl font-bold text-success">82%</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-card shadow-card"
        >
          <p className="text-sm text-muted-foreground">Today's Classes</p>
          <p className="text-3xl font-bold text-primary">{todayEntries.length}</p>
        </motion.div>
      </div>

      {/* Menu Grid */}
      <div className="space-y-3">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => setCurrentView(item.id as View)}
              className="w-full p-4 rounded-xl bg-card shadow-card flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
            >
              <div className={cn("p-3 rounded-xl", item.color)}>
                <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Today's Next Class */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5"
      >
        <p className="text-sm text-muted-foreground mb-2">Next Class</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{nextClass ? subjects.find((subject) => subject.id === nextClass.subjectId)?.name : "No class scheduled"}</p>
            {/*
            <p className="text-sm text-muted-foreground">CS Lab 1 • 09:00 AM</p>
            */}
            <p className="text-sm text-muted-foreground">
              {nextClass
                ? `${classrooms.find((room) => room.id === nextClass.classroomId)?.roomNumber || "Room —"} • ${nextClass.startTime}`
                : "Your timetable updates automatically when the college updates it."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setCurrentView("scan")}
            className="gradient-primary border-0"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Mark
          </Button>
        </div>
      </motion.div>

      {/* Logout Button */}
      <div className="pt-4 border-t border-border">
        <Button
          onClick={() => {
            setCurrentUser(null);
            authAPI.logout();
          }}
          variant="outline"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </motion.div>
  );

  const renderAttendance = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("home")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">My Attendance</h2>
      </div>

      {mockAttendance.map((subject, index) => (
        <motion.div
          key={subject.code}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-4 rounded-xl bg-card shadow-card"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold">{subject.subject}</p>
              <p className="text-sm text-muted-foreground">{subject.code}</p>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-bold",
              subject.percentage >= 75
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}>
              {subject.percentage}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${subject.percentage}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                className={cn(
                  "h-full rounded-full",
                  subject.percentage >= 75 ? "bg-success" : "bg-destructive"
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {subject.classes} / {subject.total} classes attended
            </p>
          </div>
        </motion.div>
      ))}

      {/* Low Attendance Warning */}
      {mockAttendance.some(s => s.percentage < 75) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-xl bg-warning/10 border border-warning/20"
        >
          <p className="text-sm text-warning font-medium">
            ⚠️ Some subjects have attendance below 75%. Attend more classes to avoid issues.
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const renderSchedule = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("home")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Today's Schedule</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {availableDays.map((day) => (
          <Button
            key={day}
            type="button"
            size="sm"
            variant={selectedDay === day ? "gradient" : "outline"}
            onClick={() => setSelectedDay(day)}
            className="shrink-0"
          >
            {day.slice(0, 3)}
          </Button>
        ))}
      </div>

      {profileError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          {profileError} Ask the administrator to set your semester and division in your student profile.
        </div>
      ) : null}

      <div className="space-y-3">
        {mockSchedule.map((slot, index) => {
          const isBreak = slot.subject === "Break" || slot.subject === "Lunch";
          const isPast = index < 2;
          const isCurrent = index === 2;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-xl flex items-center gap-4",
                isBreak
                  ? "bg-secondary/50"
                  : "bg-card shadow-card",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              <div className="text-center min-w-16">
                <p className="font-bold text-lg">{slot.time}</p>
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-semibold",
                  isBreak && "text-muted-foreground"
                )}>
                  {slot.subject}
                </p>
                {!isBreak && (
                  <p className="text-sm text-muted-foreground">{slot.room}</p>
                )}
              </div>
              {isPast && !isBreak && (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
              {isCurrent && !isBreak && (
                <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  Now
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  const renderScan = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("home")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Scan Attendance</h2>
      </div>

      <QRScanner onAttendanceMarked={handleAttendanceMarked} />
    </motion.div>
  );

  const renderContent = () => {
    switch (currentView) {
      case "scan":
        return renderScan();
      case "attendance":
        return renderAttendance();
      case "schedule":
        return renderSchedule();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4 pb-8">
        {/* App Header */}
        {currentView === "home" && (
          <div className="flex items-center justify-center gap-2 py-4 mb-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AttendEase</span>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
};

export default StudentPortal;
