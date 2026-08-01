import { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, Building2, GraduationCap,
  Clock, Settings, Calendar, AlertTriangle, Download,
  Bell, ChevronRight, LogOut, Menu, X, Zap, UserCheck,
  BarChart3, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimetableStore } from "@/store/timetableStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { NavLink } from "../NavLink";

interface SidebarProps {
  onOpenImport?: () => void;
}

const navGroups = [
    {
        label: "Overview",
        items: [
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
    },
    {
        label: "Master Data",
        items: [
            { id: "faculty", label: "Faculty", icon: Users, roles: ["hod"] },
            { id: "subjects", label: "Subjects", icon: BookOpen, roles: ["hod"] },
            { id: "classrooms", label: "Classrooms", icon: Building2, roles: ["hod"] },
            { id: "semesters", label: "Semesters & Divisions", icon: GraduationCap, roles: ["hod"] },
            { id: "timeslots", label: "Lecture Slots", icon: Clock, roles: ["hod"] },
        ],
    },
    {
        label: "Timetable",
        items: [
            { id: "generator", label: "Timetable Generator", icon: Zap, roles: ["hod"] },
            { id: "timetable", label: "View Timetable", icon: Calendar },
            { id: "conflicts", label: "Conflict Checker", icon: AlertTriangle, roles: ["hod"] },
            { id: "search", label: "Search", icon: Search },
        ],
    },
    {
        label: "Management",
        items: [
            { id: "requests", label: "Faculty Requests", icon: UserCheck, roles: ["hod", "faculty"] },
            { id: "leave", label: "Leave Management", icon: Calendar, roles: ["hod", "faculty"] },
            { id: "notifications", label: "Notifications", icon: Bell },
        ],
    },
    {
        label: "Reports",
        items: [
            { id: "reports", label: "Reports", icon: BarChart3, roles: ["hod"] },
            { id: "downloads", label: "Downloads", icon: Download },
        ],
    },
    {
        label: "Configuration",
        items: [
            { id: "settings", label: "College Settings", icon: Settings, roles: ["hod"] },
        ],
    },
];

const Sidebar = ({ onOpenImport }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1024);
  const { currentUser, notifications, collegeConfig, toggleDarkMode, isDarkMode } = useTimetableStore();
  const location = useLocation();
  const activeTab = location.pathname.split("/")[2] || "dashboard";

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    useTimetableStore.getState().setCurrentUser(null);
    toast.info("Logged out successfully");
    window.location.href = "/login";
  };

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(currentUser?.role || "student");
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="sidebar-toggle"
        className={cn(
          "fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-lg lg:hidden",
          "bg-sidebar-background text-sidebar-foreground border border-sidebar-border"
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "spring", damping: 30, stiffness: 250 }}
        className={cn(
          "fixed left-0 lg:left-6 top-0 lg:top-6 h-full lg:h-[calc(100vh-3rem)] w-[280px] z-40 flex flex-col",
          "bg-sidebar-background/80 backdrop-blur-2xl border border-sidebar-border/50 overflow-hidden lg:rounded-3xl shadow-2xl"
        )}
      >
        {/* Logo Header */}
        <div className="p-6 border-b border-sidebar-border/50 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base text-sidebar-foreground leading-tight truncate">
                Smart Timetable
              </h1>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {collegeConfig.collegeName}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="nav-group-label mb-2">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const badgeCount = item.id === "notifications" ? unreadCount : undefined;

                return (
                  <NavLink
                    key={item.id}
                    to={`/app/${item.id}`}
                    onClick={() => {
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                    className="sidebar-item w-full mb-0.5"
                    activeClassName="active"
                  >
                    <Icon className="sidebar-item-icon" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {badgeCount ? (
                      <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : activeTab === item.id ? (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0 space-y-3">
        {/* Excel Import Button */}
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "linear-gradient(135deg, hsl(142,72%,28%), hsl(158,64%,34%))", color: "white" }}
            >
              <span className="text-base">📊</span>
              <span>Import Excel Data</span>
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <span className="text-base">{isDarkMode ? "☀️" : "🌙"}</span>
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {getInitials(currentUser?.name || "User")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {currentUser?.name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">
                {currentUser?.role || "guest"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
