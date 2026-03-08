import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/types/booking";

interface TimeSlotsSectionProps {
  slots: TimeSlot[];
  selectedTime: string;
  loading: boolean;
  serviceSelected: boolean;
  serviceDuration: number | null;
  onSelect: (time: string) => void;
}

export function TimeSlotsSection({
  slots,
  selectedTime,
  loading,
  serviceSelected,
  serviceDuration,
  onSelect,
}: TimeSlotsSectionProps) {
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
      ) : slots.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum horário disponível</p>
          <p className="text-xs mt-1 text-muted-foreground">Tente outra data</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => onSelect(slot.time)}
              className={cn(
                "px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                selectedTime === slot.time
                  ? "bg-gradient-to-r from-primary to-primary/80 text-foreground"
                  : "bg-muted/50 text-foreground hover:bg-accent border border-border",
              )}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
