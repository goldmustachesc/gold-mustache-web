import { Receipt } from "lucide-react";
import type { ServiceData } from "@/types/booking";
import { formatDateDisplay } from "@/utils/scheduling";

interface BookingSummaryProps {
  service: ServiceData;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function BookingSummary({
  service,
  date,
  time,
  clientName,
  clientPhone,
}: BookingSummaryProps) {
  return (
    <div className="bg-muted/50 rounded-2xl p-6 border border-primary/30">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Resumo</h3>
      </div>
      <div className="space-y-3 text-sm">
        <SummaryRow label="Cliente:">
          <span className="font-medium text-foreground truncate ml-2 max-w-[140px]">
            {clientName || "-"}
          </span>
        </SummaryRow>
        <SummaryRow label="Telefone:">
          <span className="font-medium text-foreground">
            {clientPhone || "-"}
          </span>
        </SummaryRow>
        <SummaryRow label="Serviço:">
          <span className="font-medium text-foreground">{service.name}</span>
        </SummaryRow>
        <SummaryRow label="Data:">
          <span className="font-medium text-foreground">
            {formatDateDisplay(date)}
          </span>
        </SummaryRow>
        <SummaryRow label="Horário:">
          <span className="font-medium text-foreground">{time}</span>
        </SummaryRow>
        <SummaryRow label="Duração:">
          <span className="font-medium text-foreground">
            {service.duration} min
          </span>
        </SummaryRow>
        <div className="flex justify-between pt-3 border-t border-border">
          <span className="text-muted-foreground">Valor:</span>
          <span className="font-bold text-xl text-primary">
            R$ {service.price.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>
    </div>
  );
}
