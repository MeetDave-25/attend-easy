import { useState } from "react";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/store/timetableStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, Lock, ArrowRight, Activity, ShieldCheck, WifiOff, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/lib/api";

// ── Local demo accounts (work without any backend) ────────────────────────────
// These allow the app to be used fully offline / without a server.
const LOCAL_ACCOUNTS: Record<string, { name: string; role: "hod" | "faculty" | "student"; id: string }> = {
  "hod@college.edu":     { name: "HOD Admin",      role: "hod",     id: "local-hod-1" },
  "admin@college.edu":   { name: "Administrator",   role: "hod",     id: "local-hod-2" },
  "admin@attend.com":    { name: "HOD Admin",       role: "hod",     id: "local-hod-3" },
  "faculty@college.edu": { name: "Faculty Member",  role: "faculty", id: "local-fac-1" },
  "student@college.edu": { name: "Student",         role: "student", id: "local-stu-1" },
};

const tryLocalLogin = (email: string, password: string) => {
  if (!email || password.length < 3) return null;
  const account = LOCAL_ACCOUNTS[email.toLowerCase().trim()];
  return account ?? null;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLocalHint, setShowLocalHint] = useState(false);
  const { setCurrentUser, collegeConfig } = useTimetableStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Try real backend first
      const { user } = await authAPI.login(email, password);
      setCurrentUser(user);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === "student" ? "/student" : "/app");
    } catch (backendError) {
      // 2. If backend is unreachable, try local login
      const isNetworkError = backendError instanceof Error &&
        (backendError.message.includes("No response from server") ||
         backendError.message.includes("timeout") ||
         backendError.message.includes("Network Error") ||
         backendError.message.includes("ECONNREFUSED"));

      if (isNetworkError) {
        const localAccount = tryLocalLogin(email, password);
        if (localAccount) {
          setCurrentUser({
            id: localAccount.id,
            name: localAccount.name,
            email: email.trim(),
            role: localAccount.role,
          });
          toast.success(`Welcome, ${localAccount.name}! (Offline mode — data saved locally)`);
          navigate(localAccount.role === "student" ? "/student" : "/app");
          return;
        }

        // Backend is down and email isn't a known local account
        setShowLocalHint(true);
        toast.error("Backend server is offline", {
          description: "Use a local account below, or check your backend URL in .env",
          duration: 7000,
        });
      } else {
        // Auth error (wrong password, user not found, etc.)
        toast.error(backendError instanceof Error ? backendError.message : "Unable to sign in");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, role: "hod" | "faculty" | "student") => {
    setEmail(quickEmail);
    setPassword("local123");
  };

  return (
    <div className="login-page min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="login-grid absolute inset-0 -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-layout w-full max-w-5xl"
      >
        <section className="login-pitch">
          <div className="login-pitch-top"><span className="login-live-dot" /> LJCCA / CAMPUS OS <span>03.01</span></div>
          <div className="login-wireframe" aria-hidden="true">
            <div className="wireframe-ring ring-one" /><div className="wireframe-ring ring-two" /><div className="wireframe-core"><Calendar size={32} /></div>
          </div>
          <div className="login-pitch-copy"><p className="login-kicker">COMMAND CENTER</p><h1>Make the<br /><span>day move.</span></h1><p>One precise workspace for timetables, people, rooms, and attendance.</p></div>
          <div className="login-signal-row"><span><Activity size={14} /> network ready</span><span><ShieldCheck size={14} /> secure access</span></div>
        </section>

        <div className="glass-card rounded-3xl p-8 shadow-2xl border-border/50 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-lg mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to {collegeConfig.collegeName || "Smart Timetable System"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@college.edu" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-12"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              variant="gradient" 
              size="lg" 
              className="w-full h-12 text-base font-semibold group mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In 
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* ── Offline / Local mode panel ── */}
          <div className="border-t border-border pt-5 space-y-3">
            <button
              type="button"
              onClick={() => setShowLocalHint(!showLocalHint)}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5" />
              No backend / working offline? Use a local account
            </button>

            {showLocalHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3"
              >
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3.5 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Local accounts work without any backend server. All your timetable data
                      is saved in your browser's storage.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {[
                      { email: "admin@college.edu", role: "HOD / Admin" as const, color: "blue" },
                      { email: "faculty@college.edu", role: "Faculty" as const, color: "purple" },
                      { email: "student@college.edu", role: "Student" as const, color: "green" },
                    ].map(({ email: qEmail, role, color }) => (
                      <button
                        key={qEmail}
                        type="button"
                        onClick={() => handleQuickLogin(qEmail, role === "HOD / Admin" ? "hod" : role.toLowerCase() as any)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-all hover:scale-[1.01] active:scale-[0.99] bg-background border-border hover:border-${color}-500/40`}
                      >
                        <span className="font-mono text-muted-foreground">{qEmail}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}>
                          {role}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Use any password (min 3 chars) with the above emails
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
