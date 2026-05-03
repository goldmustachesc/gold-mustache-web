import { Clock, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { SmartTimePicker } from "@/components/booking/SmartTimePicker";
import { buildSmartTimePickerModel } from "@/lib/booking/smart-time-picker";
import type { BookingAvailability } from "@/types/booking";

interface TimeSlotsSectionProps {
  availability: BookingAvailability | null;
  selectedTime: string;
  loading: boolean;
  serviceSelected: boolean;
  serviceDuration: number | null;
  onSelect: (time: string) => void;
}

export function TimeSlotsSection({
  availability,
  selectedTime,
  loading,
  serviceSelected,
  serviceDuration,
  onSelect,
}: TimeSlotsSectionProps) {
  const model = useMemo(() => {
    if (!availability || !serviceDuration) return null;
    return buildSmartTimePickerModel({
      windows: availability.windows,
      serviceDurationMinutes: serviceDuration,
    });
  }, [availability, serviceDuration]);

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
      ) : model ? (
        <SmartTimePicker
          model={model}
          selectedStartTime={selectedTime}
          onSelectTime={onSelect}
          onConfirm={onSelect}
          showConfirmButton={false}
        />
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma janela disponível</p>
          <p className="text-xs mt-1">Tente outra data ou outro serviço</p>
        </div>
      )}
    </div>
  );
}
