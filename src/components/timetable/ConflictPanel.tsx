import { Conflict } from "@/types";
import { AlertTriangle, Info, XCircle } from "lucide-react";

interface ConflictPanelProps {
  conflicts: Conflict[];
}

const ConflictPanel = ({ conflicts }: ConflictPanelProps) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-4">
      {conflicts.map((conflict, index) => (
        <div 
          key={conflict.id || index}
          className={`flex gap-4 p-4 rounded-xl border ${
            conflict.severity === 'error' 
              ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' 
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
          }`}
        >
          <div className="shrink-0 mt-1">
            {conflict.severity === 'error' ? (
              <XCircle className="w-6 h-6 text-red-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            )}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${
              conflict.severity === 'error' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
            }`}>
              {conflict.type.replace('_', ' ').toUpperCase()}
            </h4>
            <p className="text-sm mt-1 mb-3 text-foreground/80">{conflict.description}</p>
            
            {conflict.suggestions && conflict.suggestions.length > 0 && (
              <div className="bg-background/50 rounded-lg p-3 text-sm border border-border/50">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>Suggestions</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {conflict.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConflictPanel;
