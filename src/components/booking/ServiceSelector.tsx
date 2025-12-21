"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceData } from "@/types/booking";
import { Clock, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceSelectorProps {
  services: ServiceData[];
  selectedService: ServiceData | null;
  onSelect: (service: ServiceData) => void;
  isLoading?: boolean;
}

export function ServiceSelector({
  services,
  selectedService,
  onSelect,
  isLoading,
}: ServiceSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum serviço disponível no momento.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {services.map((service) => (
        <Card
          key={service.id}
          onClick={() => onSelect(service)}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
            selectedService?.id === service.id
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/50",
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Scissors className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{service.name}</CardTitle>
              </div>
            </div>
            {service.description && (
              <CardDescription className="text-sm mt-1">
                {service.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary">
                R$ {service.price.toFixed(2).replace(".", ",")}
              </span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{service.duration} min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
