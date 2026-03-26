"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackFormProps {
  /** Callback when form is submitted */
  onSubmit: (data: { rating: number; comment?: string }) => Promise<void>;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Optional initial values */
  initialRating?: number;
  initialComment?: string;
  /** Barber name to display */
  barberName?: string;
  /** Service name to display */
  serviceName?: string;
  /** Additional class names */
  className?: string;
}

export function FeedbackForm({
  onSubmit,
  isLoading = false,
  initialRating = 0,
  initialComment = "",
  barberName,
  serviceName,
  className,
}: FeedbackFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Por favor, selecione uma avaliação");
      return;
    }

    try {
      await onSubmit({
        rating,
        comment: comment.trim() || undefined,
      });
    } catch {
      setError("Erro ao enviar avaliação. Tente novamente.");
    }
  };

  const getRatingLabel = (value: number) => {
    const labels: Record<number, string> = {
      1: "Muito ruim",
      2: "Ruim",
      3: "Regular",
      4: "Bom",
      5: "Excelente",
    };
    return labels[value] || "";
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Context Info */}
      {(barberName || serviceName) && (
        <div className="text-center space-y-1">
          {barberName && (
            <p className="text-sm text-muted-foreground">
              Atendimento com{" "}
              <span className="font-medium text-foreground">{barberName}</span>
            </p>
          )}
          {serviceName && (
            <p className="text-xs text-muted-foreground">
              Serviço: {serviceName}
            </p>
          )}
        </div>
      )}

      {/* Rating Section */}
      <div className="space-y-3">
        <p className="block text-sm font-medium text-center">
          Como foi seu atendimento?
        </p>

        <div className="flex flex-col items-center gap-2">
          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
            disabled={isLoading}
          />

          {rating > 0 && (
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                rating <= 2 && "text-red-500",
                rating === 3 && "text-yellow-500",
                rating >= 4 && "text-green-500",
              )}
            >
              {getRatingLabel(rating)}
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      {/* Comment Section */}
      <div className="space-y-2">
        <label htmlFor="comment" className="block text-sm font-medium">
          Comentário <span className="text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte-nos mais sobre sua experiência..."
          rows={4}
          disabled={isLoading}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/500
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || rating === 0}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Enviar Avaliação
          </>
        )}
      </Button>
    </form>
  );
}
