import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  User,
  ArrowLeft,
  LogOut,
  Bell,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authAPI, studentsAPI } from "@/lib/api";
import { useTimetableStore } from "@/store/timetableStore";
import { notificationsForUser } from "@/lib/notifications";

type View = "home" | "schedule" | "notifications";

const minutesFromTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  year: number;
  semester?: number;
  division?: string;
  email: string;
}

const StudentPortal = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const {
    setCurrentUser, currentUser, timetableEntries, subjects, classrooms,
    semesters, timeSlots, collegeConfig, notifications, markNotificationRead,
  } = useTimetableStore();
  const authUser = currentUser || authAPI.getCurrentUser();
  const todayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const [selectedDay, setSelectedDay] = useState(todayName);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
    return minutesFromTime(entry.endTime) >= now.getHours() * 60 + now.getMinutes();
  }) || todayEntries[0];
  const studentNotifications = notificationsForUser(notifications, authUser, now);
  const mockStudent = {
    rollNumber: studentProfile?.rollNumber || "Profile loading",
    year: studentProfile?.year || "—",
  };
  const mockSchedule = daySlots.map((slot) => {
    const entry = liveEntries.find((item) => item.timeSlotId === slot.id);
    const subject = subjects.find((item) => item.id === entry?.subjectId);
    const room = classrooms.find((item) => item.id === entry?.classroomId);
    const isBreak = slot.slotType === "break" || slot.slotType === "lunch";
    const roomDisplay = room?.roomNumber ? `Room ${room.roomNumber}` : entry ? "Room not assigned yet" : "â€”";
    return {
      time: slot.startTime,
      endTime: slot.endTime,
      roomDisplay,
      hasLecture: Boolean(entry),
      subject: isBreak ? (slot.slotType === "lunch" ? "Lunch" : "Break") : subject?.name || "No class",
      room: room?.roomNumber ? `Room ${room.roomNumber}` : "—",
    };
  });

  const menuItems = [
    {
      id: "schedule",
      label: "My Timetable",
      description: "Subjects, rooms and class times",
      icon: Calendar,
      color: "bg-success"
    },
    {
      id: "notifications",
      label: "College Updates",
      description: studentNotifications.length ? `${studentNotifications.length} announcement${studentNotifications.length === 1 ? "" : "s"}` : "No new announcements",
      icon: Bell,
      color: "bg-violet-600"
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

      {/* Today's timetable summary */}
      <div className="grid grid-cols-1 gap-4">
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
        <p className="text-sm text-muted-foreground mb-2">Next Lecture</p>
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
          <Button size="sm" onClick={() => setCurrentView("schedule")} className="gradient-primary border-0">View</Button>
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

  /* Legacy attendance UI intentionally removed: this is a timetable-only student portal.
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

      // Low attendance warning (legacy)
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

  ); */

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
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const isTodayView = selectedDay === todayName;
          const isPast = isTodayView && minutesFromTime(slot.endTime) <= nowMinutes;
          const isCurrent = isTodayView && !isBreak && minutesFromTime(slot.time) <= nowMinutes && nowMinutes < minutesFromTime(slot.endTime);

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
                {!isBreak && slot.hasLecture && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary"><MapPin className="h-4 w-4" />{slot.roomDisplay}</p>
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

  const renderNotifications = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("home")}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h2 className="text-xl font-bold">College Updates</h2><p className="text-sm text-muted-foreground">Timetable changes and announcements</p></div>
      </div>
      {studentNotifications.length === 0 ? <div className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">No updates right now.</div> : studentNotifications.map((notification) => <button key={notification.id} onClick={() => markNotificationRead(notification.id)} className="w-full rounded-xl bg-card p-4 text-left shadow-card"><div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-muted-foreground/30" : "bg-primary"}`} /><div><p className="font-semibold">{notification.title}</p><p className="mt-1 text-sm text-muted-foreground">{notification.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p></div></div></button>)}
    </motion.div>
  );

  /* Legacy QR attendance screen intentionally removed.
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

  ); */

  const renderContent = () => {
    switch (currentView) {
      case "schedule":
        return renderSchedule();
      case "notifications":
        return renderNotifications();
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
