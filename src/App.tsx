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
import SplashScreen from "./components/shared/SplashScreen";
import { useTimetableStore } from "./store/timetableStore";

const queryClient = new QueryClient();

// Auth Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useTimetableStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => {
  // Show splash only once per session
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("splashShown");
  });

  useEffect(() => {
    // Automatically load dummy data on startup if the app isn't configured yet
    const store = useTimetableStore.getState();
    if (!store.collegeConfig.isConfigured && store.faculty.length === 0) {
      store.loadDummyData();
      console.log("Dummy data automatically loaded for testing.");
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("splashShown", "true");
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="app-container">
          <Toaster />
          <Sonner />

          {/* Cinematic Splash Screen — only on first visit per session */}
          {showSplash && (
            <SplashScreen
              onComplete={handleSplashComplete}
              collegeName="LJCCA"
            />
          )}

          <BrowserRouter>
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
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
