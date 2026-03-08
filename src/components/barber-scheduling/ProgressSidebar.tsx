import { Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  label: string;
  completed: boolean;
}

interface ProgressSidebarProps {
  steps: ProgressStep[];
  completedSteps: number;
}

export function ProgressSidebar({
  steps,
  completedSteps,
}: ProgressSidebarProps) {
  const total = steps.length;
  const percentage = (completedSteps / total) * 100;

  return (
    <div className="bg-card/30 rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Progresso</h3>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                step.completed
                  ? "bg-emerald-500 text-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {step.completed ? <Check className="h-3 w-3" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-sm",
                step.completed ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-bold text-primary">
            {completedSteps}/{total}
          </span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            data-testid="progress-fill"
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
