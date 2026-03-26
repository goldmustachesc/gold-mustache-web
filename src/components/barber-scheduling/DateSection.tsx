import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateOption } from "@/utils/scheduling";

interface DateSectionProps {
  dates: DateOption[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function DateSection({
  dates,
  selectedDate,
  onSelect,
}: DateSectionProps) {
  return (
    <div className="bg-muted/50 rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Data</h2>
          <p className="text-xs text-muted-foreground">Escolha a data</p>
        </div>
      </div>
      <Select value={selectedDate} onValueChange={onSelect}>
        <SelectTrigger className="bg-card border-border text-foreground h-11">
          <SelectValue placeholder="Selecione uma data" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-60">
          {dates.map((date) => (
            <SelectItem
              key={date.value}
              value={date.value}
              className="text-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <div className="flex items-center gap-2">
                <span>{date.display}</span>
                <span className="text-muted-foreground capitalize">
                  {date.weekday}
                </span>
                {date.isToday && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    Hoje
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
