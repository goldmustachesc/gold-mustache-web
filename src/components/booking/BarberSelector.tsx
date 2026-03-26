"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { BarberData } from "@/types/booking";
import { User } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BarberSelectorProps {
  barbers: BarberData[];
  selectedBarber: BarberData | null;
  onSelect: (barber: BarberData) => void;
  isLoading?: boolean;
}

export function BarberSelector({
  barbers,
  selectedBarber,
  onSelect,
  isLoading,
}: BarberSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="h-5 bg-muted rounded w-24" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          Nenhum barbeiro disponível no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {barbers.map((barber) => (
        <Card
          key={barber.id}
          onClick={() => onSelect(barber)}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
            selectedBarber?.id === barber.id
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/50",
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {barber.avatarUrl ? (
                <Image
                  src={barber.avatarUrl}
                  alt={barber.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <CardTitle className="text-base">{barber.name}</CardTitle>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
