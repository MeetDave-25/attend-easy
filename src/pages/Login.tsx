import { useState } from "react";
import { motion } from "framer-motion";
import { useTimetableStore } from "@/store/timetableStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, Lock, ArrowRight, Activity, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/lib/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser, collegeConfig } = useTimetableStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { user } = await authAPI.login(email, password);
      setCurrentUser(user);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === "student" ? "/student" : "/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
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

        <div className="glass-card rounded-3xl p-8 shadow-2xl border-border/50">
          <div className="text-center mb-8">
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
                  placeholder="admin@attend.com" 
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
                <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
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

        </div>
      </motion.div>
    </div>
  );
};

export default Login;
