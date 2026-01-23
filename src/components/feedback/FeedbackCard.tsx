"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StarRatingDisplay } from "@/components/ui/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackWithDetails } from "@/types/feedback";

interface FeedbackCardProps {
  feedback: FeedbackWithDetails;
  /** Show barber info (for admin view) */
  showBarber?: boolean;
  /** Compact mode for lists */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function FeedbackCard({
  feedback,
  showBarber = false,
  compact = false,
  className,
}: FeedbackCardProps) {
  const clientName =
    feedback.client?.fullName ||
    feedback.guestClient?.fullName ||
    "Cliente Anônimo";

  const clientInitials = clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = formatDistanceToNow(new Date(feedback.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className={cn(compact ? "h-8 w-8" : "h-10 w-10")}>
                <AvatarFallback className="bg-zinc-700 text-zinc-300">
                  {clientInitials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p
                  className={cn(
                    "font-medium truncate",
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  {clientName}
                </p>
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
              </div>
            </div>

            <StarRatingDisplay
              value={feedback.rating}
              size={compact ? "sm" : "md"}
              showValue={false}
            />
          </div>

          {/* Barber info (for admin) */}
          {showBarber && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Barbeiro: {feedback.barber.name}</span>
            </div>
          )}

          {/* Service info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 bg-zinc-800 rounded-full">
              {feedback.appointment.service.name}
            </span>
            <span>•</span>
            <span>{feedback.appointment.date}</span>
          </div>

          {/* Comment */}
          {feedback.comment && (
            <div
              className={cn(
                "flex gap-2 text-sm",
                compact ? "line-clamp-2" : "",
              )}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{feedback.comment}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state when no feedbacks are available
 */
export function FeedbackEmptyState({
  message = "Nenhuma avaliação encontrada",
  description = "Quando seus clientes avaliarem os atendimentos, elas aparecerão aqui.",
}: {
  message?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-zinc-200">{message}</h3>
      <p className="text-sm text-zinc-400 mt-1 max-w-sm">{description}</p>
    </div>
  );
}
