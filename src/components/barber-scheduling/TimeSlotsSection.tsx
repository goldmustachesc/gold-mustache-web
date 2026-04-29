import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingAvailability } from "@/types/booking";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildTimeSelectionFeedback,
  type TimeSelectionFeedback,
} from "@/lib/booking/time-selection-feedback";
import { TimeSelectionFeedbackPanel } from "@/components/booking/TimeSelectionFeedbackPanel";
import {
  BOOKING_START_TIME_STEP_MINUTES,
  roundTimeUpToSlotBoundary,
} from "@/utils/time-slots";

interface TimeSlotsSectionProps {
  availability: BookingAvailability | null;
  selectedTime: string;
  loading: boolean;
  serviceSelected: boolean;
  serviceDuration: number | null;
  onSelect: (time: string) => void;
  selectedTimeError?: string | null;
  selectedTimeFeedback?: TimeSelectionFeedback | null;
}

export function TimeSlotsSection({
  availability,
  selectedTime,
  loading,
  serviceSelected,
  serviceDuration,
  onSelect,
  selectedTimeError = null,
  selectedTimeFeedback = null,
}: TimeSlotsSectionProps) {
  const windows = availability?.windows ?? [];
  const feedback =
    selectedTimeFeedback ??
    (availability && selectedTime && serviceDuration
      ? buildTimeSelectionFeedback({
          windows: availability.windows,
          selectedStartTime: selectedTime,
          serviceDurationMinutes: serviceDuration,
        })
      : null);
  const computedError =
    feedback && feedback.status !== "valid"
      ? feedback.message
      : selectedTimeError;

  return (
    <div className="bg-muted/50 rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Horário</h2>
          <p className="text-xs text-muted-foreground">
            {serviceDuration
              ? `Duração: ${serviceDuration} min`
              : "Selecione um serviço primeiro"}
          </p>
        </div>
      </div>

      {!serviceSelected ? (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Selecione um serviço para ver os horários</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : windows.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma janela disponível</p>
          <p className="text-xs mt-1 text-muted-foreground">
            Tente outra data ou outro serviço
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Janelas livres
            </p>
            <div className="flex flex-wrap gap-2">
              {windows.map((window) => (
                <span
                  key={`${window.startTime}-${window.endTime}`}
                  className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                >
                  {window.startTime} - {window.endTime}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barber-exact-time">Escolha o início exato</Label>
            <Input
              id="barber-exact-time"
              aria-label="Escolha o início exato"
              type="time"
              step={BOOKING_START_TIME_STEP_MINUTES * 60}
              value={selectedTime}
              onChange={(event) =>
                onSelect(roundTimeUpToSlotBoundary(event.target.value) ?? "")
              }
              className={cn(
                "min-w-0 max-w-full appearance-none",
                computedError &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
            />
            <p className="text-xs text-muted-foreground">
              Use intervalos de {BOOKING_START_TIME_STEP_MINUTES} minutos dentro
              das janelas acima.
            </p>
            {feedback && (
              <TimeSelectionFeedbackPanel
                feedback={feedback}
                selectedTime={selectedTime}
                onSelectTime={onSelect}
                className="rounded-xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
