import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import {
  Users, BookOpen, Building2, GraduationCap, Calendar, Zap, Settings,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, ArrowRight, Plus,
  BarChart3, Layers, Star, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
};

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { faculty, subjects, classrooms, semesters, timetableEntries, conflicts, isPublished, currentUser, collegeConfig } = useTimetableStore();

  const totalDivisions = semesters.reduce((acc, s) => acc + s.divisions.length, 0);
  const activeFaculty = faculty.filter(f => f.status === 'active').length;
  const availableRooms = classrooms.filter(c => c.status === 'available').length;
  const errorConflicts = conflicts.filter(c => c.severity === 'error').length;
  const readinessScore = Math.round(
    ((faculty.length > 0 ? 25 : 0) + (subjects.length > 0 ? 25 : 0) + (classrooms.length > 0 ? 25 : 0) + (semesters.length > 0 ? 25 : 0))
  );

  const stats = [
    {
      label: "Total Faculty",
      value: faculty.length,
      sub: `${activeFaculty} Active`,
      icon: Users,
      gradient: "from-blue-500 to-cyan-400",
      glow: "rgba(59,130,246,0.3)",
      tab: "faculty",
    },
    {
      label: "Subjects",
      value: subjects.length,
      sub: `Across ${semesters.length} semesters`,
      icon: BookOpen,
      gradient: "from-violet-500 to-purple-400",
      glow: "rgba(139,92,246,0.3)",
      tab: "subjects",
    },
    {
      label: "Classrooms",
      value: classrooms.length,
      sub: `${availableRooms} Available`,
      icon: Building2,
      gradient: "from-emerald-500 to-teal-400",
      glow: "rgba(16,185,129,0.3)",
      tab: "classrooms",
    },
    {
      label: "Student Divisions",
      value: totalDivisions,
      sub: `${semesters.length} Semesters`,
      icon: GraduationCap,
      gradient: "from-orange-500 to-amber-400",
      glow: "rgba(249,115,22,0.3)",
      tab: "semesters",
    },
  ];

  const quickActions = [
    { label: "Add Faculty", icon: Users, tab: "faculty", gradient: "from-blue-500 to-blue-600", desc: "Register a professor" },
    { label: "Add Subject", icon: BookOpen, tab: "subjects", gradient: "from-violet-500 to-violet-600", desc: "Define curriculum" },
    { label: "Add Room", icon: Building2, tab: "classrooms", gradient: "from-emerald-500 to-emerald-600", desc: "Setup space" },
    { label: "Generate", icon: Zap, tab: "generator", gradient: "from-amber-500 to-orange-500", desc: "Build timetable" },
  ];

  const setupSteps = [
    { label: "College Settings", done: collegeConfig.isConfigured, tab: "settings", icon: Settings },
    { label: "Faculty Added", done: faculty.length > 0, tab: "faculty", icon: Users },
    { label: "Subjects Added", done: subjects.length > 0, tab: "subjects", icon: BookOpen },
    { label: "Classrooms Added", done: classrooms.length > 0, tab: "classrooms", icon: Building2 },
    { label: "Semesters Added", done: semesters.length > 0, tab: "semesters", icon: GraduationCap },
    { label: "Timetable Generated", done: timetableEntries.length > 0, tab: "generator", icon: Calendar },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Welcome Hero */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl p-8 text-white"
        style={{ background: "linear-gradient(135deg, hsl(245,80%,50%) 0%, hsl(270,75%,55%) 50%, hsl(295,70%,55%) 100%)" }}
      >
        {/* Background orbs */}
        <div className="absolute top-[-30%] right-[-5%] w-80 h-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <div className="absolute bottom-[-30%] left-[10%] w-60 h-60 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)" }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm font-medium mb-2 uppercase tracking-widest">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},{" "}
              {currentUser?.name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p className="text-white/75 text-base max-w-lg">
              {timetableEntries.length > 0
                ? `Your timetable has ${timetableEntries.length} scheduled lectures across ${semesters.length} semesters.`
                : "Start by setting up your master data to generate a conflict-free timetable."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-4 flex-shrink-0">
            <div className="flex gap-3">
              <Button onClick={() => navigate("/app/generator")} className="bg-white text-primary hover:bg-white/90 font-bold shadow-xl rounded-xl gap-2 px-6 h-12">
                <Zap className="w-4 h-4" /> Generate Timetable
              </Button>
              {timetableEntries.length > 0 && (
                <Button onClick={() => navigate("/app/timetable")} variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl h-12">
                  View
                </Button>
              )}
            </div>
            {timetableEntries.length > 0 && (
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isPublished ? "bg-green-500/30 text-green-200" : "bg-white/10 text-white/70"}`}>
                {isPublished ? "✓ Published" : "Draft Mode"}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.button
            key={stat.label}
            onClick={() => navigate(`/app/${stat.tab}`)}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-left p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group"
            style={{ boxShadow: `0 0 0 0 ${stat.glow}` }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(circle at 0% 0%, ${stat.glow} 0%, transparent 60%)` }} />
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4 shadow-md`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-extrabold text-foreground">{stat.value}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{stat.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            <ArrowRight className="absolute right-4 bottom-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </motion.button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Checklist */}
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Setup Progress
            </h2>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${readinessScore === 100 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10 text-primary"}`}>
              {readinessScore}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readinessScore}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, hsl(245,80%,55%), hsl(295,70%,60%))" }}
            />
          </div>

          <div className="space-y-3">
            {setupSteps.map((step, i) => (
              <motion.button
                key={step.label}
                onClick={() => !step.done && navigate(`/app/${step.tab}`)}
                whileHover={{ x: 4 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${step.done ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                  {step.done
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    : <step.icon className="w-4 h-4 text-muted-foreground" />
                  }
                </div>
                <span className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </span>
                {!step.done && <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/app/${action.tab}`)}
                className="p-4 rounded-2xl border border-border hover:border-transparent hover:shadow-lg transition-all text-left relative overflow-hidden group bg-muted/30"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-md`}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            System Status
          </h2>
          <div className="space-y-4">
            {/* Timetable Status */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Timetable
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${timetableEntries.length > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {timetableEntries.length > 0 ? `${timetableEntries.length} Entries` : "Not Generated"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {timetableEntries.length > 0 ? `Published: ${isPublished ? "Yes" : "No"}` : "Run the generator to create one"}
              </p>
            </div>

            {/* Conflicts */}
            <div className={`p-4 rounded-xl border ${errorConflicts > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  {errorConflicts > 0
                    ? <AlertTriangle className="w-4 h-4 text-red-500" />
                    : <CheckCircle2 className="w-4 h-4 text-green-500" />
                  }
                  Conflicts
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${errorConflicts > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"}`}>
                  {errorConflicts > 0 ? `${errorConflicts} Errors` : "None"}
                </span>
              </div>
              {errorConflicts > 0 && (
                <Button variant="link" size="sm" onClick={() => navigate("/app/conflicts")} className="mt-1 p-0 h-auto text-xs text-red-500">
                  View & Resolve →
                </Button>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-xl font-extrabold text-foreground">{semesters.reduce((a, s) => a + s.divisions.reduce((b, d) => b + d.studentCount, 0), 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Students</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-xl font-extrabold text-foreground">{subjects.filter(s => s.type === 'lab').length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Lab Subjects</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Data Summary Table */}
      {(faculty.length > 0 || subjects.length > 0) && (
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Master Data Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Theory Subjects", value: subjects.filter(s => s.type === 'theory').length, color: "text-blue-600" },
              { label: "Lab Subjects", value: subjects.filter(s => s.type === 'lab').length, color: "text-green-600" },
              { label: "Lab Rooms", value: classrooms.filter(c => c.roomType === 'lab').length, color: "text-purple-600" },
              { label: "Lecture Halls", value: classrooms.filter(c => c.roomType === 'classroom').length, color: "text-amber-600" },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-muted/20 border border-border text-center">
                <p className={`text-2xl font-extrabold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DashboardOverview;
