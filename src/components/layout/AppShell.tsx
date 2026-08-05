import { useState, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useTimetableStore } from "@/store/timetableStore";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "../shared/ErrorBoundary";

import DashboardOverview from "../dashboard/DashboardOverview";
import FacultyManager from "../faculty/FacultyManager";
import SubjectManager from "../subjects/SubjectManager";
import ClassroomManager from "../classrooms/ClassroomManager";
import SemesterManager from "../semesters/SemesterManager";
import TimeSlotManager from "../timeslots/TimeSlotManager";
import CollegeSettings from "../settings/CollegeSettings";
import TimetableGeneratorV2 from "../timetable/TimetableGeneratorV2";
import TimetableViews from "../timetable/TimetableViews";
import ConflictPanel from "../timetable/ConflictPanel";
import ExcelImportModal from "../shared/ExcelImportModal";
import TimetableDownload from "../export/TimetableDownload";
import NotificationCenter from "../notifications/NotificationCenter";
import FacultyPortal from "@/pages/FacultyPortal";

const Placeholder = ({ title, desc }: { title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-card rounded-3xl border border-border shadow-sm">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 mb-4 flex items-center justify-center text-primary font-black text-2xl">
      {title.charAt(0)}
    </div>
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p className="text-muted-foreground max-w-md">{desc}</p>
    <div className="mt-8 px-4 py-2 bg-muted/50 rounded-lg text-sm border border-border text-muted-foreground">
      Module coming soon
    </div>
  </div>
);

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const AppShell = () => {
  const [importOpen, setImportOpen] = useState(false);
  const { isDarkMode, conflicts, currentUser } = useTimetableStore();
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  return (
    <div className="app-shell min-h-screen bg-background text-foreground flex flex-col lg:flex-row transition-colors duration-300 relative overflow-hidden">
      <div className="app-grid fixed inset-0 z-0 pointer-events-none" />

      {/* Excel Import Modal */}
      <ExcelImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

      {/* Sidebar */}
      <div className="relative z-20">
        <Sidebar onOpenImport={() => setImportOpen(true)} />
      </div>

      {/* Main Content Area */}
      <div className="app-main flex-1 flex flex-col min-w-0 lg:ml-[288px] relative z-10">
        <TopBar onOpenImport={() => setImportOpen(true)} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto pb-20">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  import TimetableGeneratorV2 from "../timetable/TimetableGeneratorV2";
                  import TimetableWizard from "../timetable/TimetableWizard";
                  import TimetableViews from "../timetable/TimetableViews";
                  //...
                                    <Routes>
                                      <Route index element={<Navigate to="dashboard" replace />} />
                                      <Route path="dashboard" element={currentUser?.role === "faculty" ? <FacultyPortal /> : <DashboardOverview />} />
                                      <Route path="faculty" element={<FacultyManager />} />
                                      <Route path="subjects" element={<SubjectManager />} />
                                      <Route path="classrooms" element={<ClassroomManager />} />
                                      <Route path="semesters" element={<SemesterManager />} />
                                      <Route path="timeslots" element={<TimeSlotManager />} />
                                      <Route path="settings" element={<CollegeSettings />} />
                                      <Route path="generator" element={<TimetableGeneratorV2 />} />
                                      <Route path="wizard" element={<TimetableWizard />} />
                                      <Route path="timetable" element={currentUser?.role === "faculty" ? <FacultyPortal /> : <TimetableViews />} />
                                      <Route path="conflicts" element={
                  //...
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">Conflict Checker</h2>
                          <p className="text-sm text-muted-foreground mt-1">Review and resolve scheduling collisions manually.</p>
                        </div>
                        {conflicts.length > 0 ? (
                          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <ConflictPanel conflicts={conflicts} />
                          </div>
                        ) : (
                          <div className="text-center py-20 bg-card rounded-2xl border border-border text-green-600 dark:text-green-400">
                            <h3 className="text-xl font-bold mb-2">✓ No Conflicts Detected</h3>
                            <p className="text-muted-foreground text-sm">Your current timetable schedule is fully conflict-free.</p>
                          </div>
                        )}
                      </div>
                    } />
                    <Route path="search" element={<Placeholder title="Timetable Search" desc="Quickly search for any faculty, subject, or classroom schedule across the entire college." />} />
                    <Route path="requests" element={<Placeholder title="Faculty Requests" desc="Manage leave requests, schedule swaps, and alternative arrangements." />} />
                    <Route path="leave" element={<Placeholder title="Leave Management" desc="Apply for leaves and track approval status." />} />
                    <Route path="notifications" element={<NotificationCenter />} />
                    <Route path="reports" element={<Placeholder title="Reports & Analytics" desc="Generate detailed reports on faculty workload, room utilization, and more." />} />
                    <Route path="downloads" element={<TimetableDownload />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
