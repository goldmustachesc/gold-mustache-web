"use client";

import { Button } from "@/components/ui/button";
import type { TimeSelectionFeedback } from "@/lib/booking/time-selection-feedback";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimeSelectionFeedbackPanelProps {
  feedback: TimeSelectionFeedback;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  className?: string;
}

export function TimeSelectionFeedbackPanel({
  feedback,
  selectedTime,
  onSelectTime,
  className,
}: TimeSelectionFeedbackPanelProps) {
  const isValid = feedback.status === "valid";
  const suggestedStartTime = feedback.suggestedStartTime;

  return (
    <output
      aria-live="polite"
      className={cn(
        "space-y-3 border p-3",
        isValid
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <div className="space-y-1">
        <p
          className={cn(
            "text-sm font-semibold",
            isValid ? "text-foreground" : "text-destructive",
          )}
        >
          {feedback.title}
        </p>
        {feedback.message && (
          <p
            className={cn(
              "text-sm",
              isValid ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {feedback.message}
          </p>
        )}
        {feedback.detail && (
          <p className="text-sm text-muted-foreground">{feedback.detail}</p>
        )}
        {feedback.matchingWindow && (
          <p className="text-xs text-muted-foreground">
            Janela usada: {feedback.matchingWindow.startTime} -{" "}
            {feedback.matchingWindow.endTime}
          </p>
        )}
      </div>

      {feedback.visibleValidStartTimes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inícios válidos
          </p>
          <div className="flex flex-wrap gap-2">
            {feedback.visibleValidStartTimes.map((time) => (
              <Button
                key={time}
                type="button"
                size="sm"
                variant={time === selectedTime ? "default" : "outline"}
                className="h-8 px-3"
                onClick={() => onSelectTime(time)}
              >
                {time}
              </Button>
            ))}
            {feedback.hiddenValidStartCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                +{feedback.hiddenValidStartCount} opções
              </span>
            )}
          </div>
        </div>
      )}

      {!isValid && feedback.actionLabel && suggestedStartTime && (
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2"
          onClick={() => onSelectTime(suggestedStartTime)}
        >
          <Clock className="h-4 w-4" />
          {feedback.actionLabel}
        </Button>
      )}
    </output>
  );
}
