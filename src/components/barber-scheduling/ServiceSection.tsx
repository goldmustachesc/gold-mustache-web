import { Clock, Scissors } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceData } from "@/types/booking";

interface ServiceSectionProps {
  services: ServiceData[] | undefined;
  selectedServiceId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function ServiceSection({
  services,
  selectedServiceId,
  loading,
  onSelect,
}: ServiceSectionProps) {
  const selectedService = services?.find((s) => s.id === selectedServiceId);

  return (
    <div className="bg-muted/50 rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scissors className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Serviço</h2>
          <p className="text-xs text-muted-foreground">Escolha o serviço</p>
        </div>
      </div>
      <Select value={selectedServiceId} onValueChange={onSelect}>
        <SelectTrigger className="bg-card border-border text-foreground h-11">
          <SelectValue placeholder="Selecione um serviço" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {loading ? (
            <div className="p-2 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : (
            services?.map((service) => (
              <SelectItem
                key={service.id}
                value={service.id}
                className="text-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{service.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {service.duration}min - R${" "}
                    {service.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedService && (
        <div className="mt-4 p-4 bg-background/50 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {selectedService.name}
            </span>
            <span className="text-sm font-bold text-primary">
              R$ {selectedService.price.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Duração: {selectedService.duration} min</span>
          </div>
        </div>
      )}
    </div>
  );
}
