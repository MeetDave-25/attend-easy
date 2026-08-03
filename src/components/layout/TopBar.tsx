import { Bell, Search, ChevronRight, Calendar, FileSpreadsheet, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import { cn } from "@/lib/utils";
import { notificationsForUser } from "@/lib/notifications";

interface TopBarProps {
  onOpenImport?: () => void;
}

const tabLabels: Record<string, string> = {
  dashboard: "Dashboard",
  faculty: "Faculty Management",
  subjects: "Subject Management",
  classrooms: "Classroom Management",
  semesters: "Semesters & Divisions",
  timeslots: "Lecture Slots",
  settings: "College Settings",
  generator: "Timetable Generator",
  timetable: "View Timetable",
  conflicts: "Conflict Checker",
  search: "Search Timetable",
  requests: "Faculty Requests",
  leave: "Leave Management",
  notifications: "Notifications",
  reports: "Reports & Analytics",
  downloads: "Downloads & Export",
};

const TopBar = ({ onOpenImport }: TopBarProps) => {
  const { notifications, currentUser, collegeConfig, isDarkMode, toggleDarkMode } = useTimetableStore();
  const location = useLocation();
  const activeTab = location.pathname.split("/")[2] || "dashboard";
  const unreadCount = notificationsForUser(notifications, currentUser).filter((n) => !n.isRead).length;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 mt-0 lg:mt-4 mx-0 lg:mx-6 mb-4 flex items-center justify-between pl-16 pr-5 lg:px-5 border border-border/80 bg-card/90 backdrop-blur-2xl z-20 lg:rounded-2xl shadow-sm relative"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium">{collegeConfig.collegeName}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        <span className="font-bold text-foreground">{tabLabels[activeTab] || activeTab}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Link
          to="/app/search"
          id="topbar-search"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground",
            "border border-border bg-muted/40 hover:bg-muted transition-colors hidden md:flex"
          )}
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 text-xs font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </Link>

        {/* Excel Import */}
        {onOpenImport && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenImport}
            id="topbar-import"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(142,72%,32%), hsl(158,64%,38%))" }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </motion.button>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          title="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Notifications */}
        <Link
          to="/app/notifications"
          id="topbar-notifications"
          className="relative p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Link>

        {/* Today's Date */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground font-medium">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default TopBar;
