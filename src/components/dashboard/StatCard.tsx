import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string; // tailwind color name: blue, green, purple, amber, red
  trend?: { value: number; label: string };
  delay?: number;
  onClick?: () => void;
}

const colorMap: Record<string, { bg: string; icon: string; glow: string; text: string }> = {
  blue:   { bg: "from-blue-500/10 to-blue-500/5",   icon: "bg-blue-500/15 text-blue-500",   glow: "group-hover:shadow-blue-500/20",   text: "text-blue-600 dark:text-blue-400" },
  green:  { bg: "from-green-500/10 to-green-500/5",  icon: "bg-green-500/15 text-green-500",  glow: "group-hover:shadow-green-500/20",  text: "text-green-600 dark:text-green-400" },
  purple: { bg: "from-purple-500/10 to-purple-500/5",icon: "bg-purple-500/15 text-purple-500",glow: "group-hover:shadow-purple-500/20",text: "text-purple-600 dark:text-purple-400" },
  amber:  { bg: "from-amber-500/10 to-amber-500/5",  icon: "bg-amber-500/15 text-amber-500",  glow: "group-hover:shadow-amber-500/20",  text: "text-amber-600 dark:text-amber-400" },
  red:    { bg: "from-red-500/10 to-red-500/5",      icon: "bg-red-500/15 text-red-500",      glow: "group-hover:shadow-red-500/20",    text: "text-red-600 dark:text-red-400" },
  indigo: { bg: "from-indigo-500/10 to-indigo-500/5",icon: "bg-indigo-500/15 text-indigo-500",glow: "group-hover:shadow-indigo-500/20",text: "text-indigo-600 dark:text-indigo-400" },
  pink:   { bg: "from-pink-500/10 to-pink-500/5",    icon: "bg-pink-500/15 text-pink-500",    glow: "group-hover:shadow-pink-500/20",   text: "text-pink-600 dark:text-pink-400" },
  cyan:   { bg: "from-cyan-500/10 to-cyan-500/5",    icon: "bg-cyan-500/15 text-cyan-500",    glow: "group-hover:shadow-cyan-500/20",   text: "text-cyan-600 dark:text-cyan-400" },
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, delay = 0, onClick }: StatCardProps) => {
  const colors = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.4, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group stat-card cursor-pointer",
        `group-hover:shadow-xl ${colors.glow}`
      )}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br rounded-2xl opacity-60", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-xs font-semibold",
                trend.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>

        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ml-4", colors.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
