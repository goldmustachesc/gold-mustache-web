"use client";

import { CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { generateSubSlots } from "@/utils/time-slots";

const SUB_SLOT_INTERVAL_MINUTES = 15;

export interface SlotActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotStart: string;
  slotEnd: string;
  onSelectTime: (time: string) => void;
  onCreateAbsence: (startTime: string, endTime: string) => void;
}

export function SlotActionSheet({
  open,
  onOpenChange,
  slotStart,
  slotEnd,
  onSelectTime,
  onCreateAbsence,
}: SlotActionSheetProps) {
  const timeOptions = generateSubSlots(
    slotStart,
    slotEnd,
    SUB_SLOT_INTERVAL_MINUTES,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>
            Adicionar em {slotStart} - {slotEnd}
          </SheetTitle>
          <SheetDescription>
            Escolha o início do atendimento ou bloqueie este intervalo.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Início do atendimento
            </p>
            <div className="flex flex-wrap gap-2">
              {timeOptions.map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectTime(time)}
                  className="rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <Button
            variant="ghost"
            className="w-full justify-start text-warning hover:text-warning hover:bg-warning/10"
            onClick={() => onCreateAbsence(slotStart, slotEnd)}
          >
            <CalendarOff className="h-4 w-4 mr-2" />
            Bloquear este intervalo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
