import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent" | "success" | "warning";
}

const variantStyles = {
  default: "bg-card",
  primary: "gradient-primary text-primary-foreground",
  accent: "gradient-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default" 
}: StatsCardProps) => {
  const isColored = variant !== "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "var(--shadow-lg)" }}
      transition={{ duration: 0.3 }}
      className={cn(
        "p-6 rounded-2xl shadow-card",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            "text-sm font-medium",
            isColored ? "opacity-90" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-sm mt-1",
              isColored ? "opacity-80" : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn(
              "text-sm mt-2 font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? "+" : "-"}{trend.value}% from last week
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          isColored ? "bg-white/20" : "bg-secondary"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
