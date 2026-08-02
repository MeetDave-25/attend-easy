import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import StudentPortal from "./pages/StudentPortal";
import ModernSplashScreen from "./components/shared/ModernSplashScreen";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { useTimetableStore } from "./store/timetableStore";
import { syncAPI } from "./lib/api";
import { toast } from "sonner";

const queryClient = new QueryClient();
const SPLASH_SESSION_KEY = "attendeasy_splash_seen";

// Auth Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useTimetableStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const SplashGate = ({ showSplash, onComplete }: { showSplash: boolean; onComplete: () => void }) => {
  if (!showSplash) return null;
  return <ModernSplashScreen onComplete={onComplete} />;
};

const App = () => {
  // Show once per browser tab/session. Logout and internal navigation do not
  // restart it, but a fresh app session gets the full launch experience.
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const currentUserId = useTimetableStore(state => state.currentUser?.id);

  useEffect(() => {
    if (!currentUserId) return;

    let isDisposed = false;
    let isHydrated = false;
    let saveTimer: number | undefined;
    let loadInProgress = false;
    let syncErrorShown = false;

    const reportSyncError = (message: string, error: unknown) => {
      console.warn(message, error);
      if (!syncErrorShown) {
        syncErrorShown = true;
        toast.error("Shared data is offline. Check VITE_API_URL, backend CORS, and database deployment.");
      }
    };

    const getPayload = () => {
      const state = useTimetableStore.getState();
      return {
        faculty: state.faculty,
        subjects: state.subjects,
        classrooms: state.classrooms,
        semesters: state.semesters,
        timeSlots: state.timeSlots,
        timetableEntries: state.timetableEntries,
        collegeConfig: state.collegeConfig,
      };
    };

    const hasWorkspaceData = (state: ReturnType<typeof useTimetableStore.getState>) =>
      state.collegeConfig.isConfigured ||
      state.faculty.length > 0 ||
      state.subjects.length > 0 ||
      state.classrooms.length > 0 ||
      state.semesters.length > 0 ||
      state.timeSlots.length > 0 ||
      state.timetableEntries.length > 0;

    const saveToServer = async () => {
      if (isDisposed || !isHydrated || loadInProgress) return;
      try {
        await syncAPI.saveState(getPayload());
      } catch (error) {
        reportSyncError("Shared workspace save failed:", error);
      }
    };

    const unsubscribe = useTimetableStore.subscribe((state, previousState) => {
      if (!isHydrated) return;
      const changed = state.collegeConfig !== previousState.collegeConfig ||
        state.faculty !== previousState.faculty ||
        state.subjects !== previousState.subjects ||
        state.classrooms !== previousState.classrooms ||
        state.semesters !== previousState.semesters ||
        state.timeSlots !== previousState.timeSlots ||
        state.timetableEntries !== previousState.timetableEntries;
      if (!changed) return;

      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => { void saveToServer(); }, 700);
    });

    const loadFromServer = async () => {
      if (isDisposed || loadInProgress) return;
      loadInProgress = true;
      isHydrated = false;
      try {
        const remote = await syncAPI.getState();
        if (isDisposed) return;

        const localState = useTimetableStore.getState();
        const remoteHasData = Boolean(
          remote.collegeConfig?.isConfigured ||
          remote.faculty.length ||
          remote.subjects.length ||
          remote.classrooms.length ||
          remote.semesters.length ||
          remote.timeSlots.length ||
          remote.timetableEntries.length
        );

        if (remoteHasData) {
          const { collegeConfig, ...sharedData } = remote;
          useTimetableStore.getState().hydrateSharedData({
            ...sharedData,
            ...(collegeConfig ? { collegeConfig } : {}),
          });
        } else if (hasWorkspaceData(localState)) {
          isHydrated = true;
          await saveToServer();
        }
        isHydrated = true;
      } catch (error) {
        isHydrated = true;
        reportSyncError("Shared workspace load failed:", error);
      } finally {
        loadInProgress = false;
      }
    };

    void loadFromServer();
    const refreshOnFocus = () => { void loadFromServer(); };
    window.addEventListener("focus", refreshOnFocus);
    const refreshTimer = window.setInterval(() => { void loadFromServer(); }, 30000);

    return () => {
      isDisposed = true;
      isHydrated = false;
      if (saveTimer) window.clearTimeout(saveTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      unsubscribe();
    };
  }, [currentUserId]);

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
    } catch {
      // Continue even if storage is disabled by the browser.
    }
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="app-container">
          <Toaster />
          <Sonner />

          {/* Cinematic Splash Screen — shown on every full page load */}
          <ErrorBoundary>
            <BrowserRouter>
              <SplashGate showSplash={showSplash} onComplete={handleSplashComplete} />
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student"
                element={
                  <ProtectedRoute>
                    <StudentPortal />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
