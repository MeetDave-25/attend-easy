import { useState } from "react";
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
import { authAPI, attendanceAPI } from "@/lib/api";
import { useTimetableStore } from "@/store/timetableStore";

type View = "home" | "scan" | "attendance" | "schedule";

// Mock student data
const mockStudent = {
  name: "John Doe",
  rollNumber: "2024CS001",
  year: 2,
  email: "john@college.edu",
};

const mockAttendance = [
  { subject: "Data Structures", code: "CS201", percentage: 85, classes: 17, total: 20 },
  { subject: "Algorithms", code: "CS301", percentage: 90, classes: 18, total: 20 },
  { subject: "Database Systems", code: "CS302", percentage: 75, classes: 15, total: 20 },
  { subject: "Operating Systems", code: "CS401", percentage: 80, classes: 16, total: 20 },
];

const mockSchedule = [
  { time: "09:00", subject: "Data Structures", room: "CS Lab 1" },
  { time: "10:00", subject: "Algorithms", room: "Room 201" },
  { time: "11:00", subject: "Break", room: "-" },
  { time: "11:30", subject: "Database Systems", room: "Room 102" },
  { time: "12:30", subject: "Lunch", room: "-" },
  { time: "14:00", subject: "Operating Systems", room: "Room 301" },
];

const StudentPortal = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const [markedSessions, setMarkedSessions] = useState<string[]>([]);
  const { setCurrentUser } = useTimetableStore();

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
            <h1 className="text-2xl font-bold">{mockStudent.name}</h1>
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
          <p className="text-3xl font-bold text-primary">4</p>
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
            <p className="font-semibold">Data Structures</p>
            <p className="text-sm text-muted-foreground">CS Lab 1 • 09:00 AM</p>
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
