"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  /** Current rating value (1-5) */
  value: number;
  /** Callback when rating changes (makes component interactive) */
  onChange?: (rating: number) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Show numeric value next to stars */
  showValue?: boolean;
  /** Label for accessibility */
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
};

export function StarRating({
  value,
  onChange,
  size = "md",
  disabled = false,
  className,
  showValue = false,
  "aria-label": ariaLabel,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const isInteractive = !!onChange && !disabled;
  const displayRating = hoverRating ?? value;

  const handleClick = (rating: number) => {
    if (isInteractive) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (isInteractive) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverRating(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (!isInteractive) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(rating);
    }
  };

  return (
    <div
      className={cn("flex items-center", gapClasses[size], className)}
      role={isInteractive ? "group" : undefined}
      title={ariaLabel || `Avaliação: ${value} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            onKeyDown={(e) => handleKeyDown(e, star)}
            disabled={!isInteractive}
            className={cn(
              "transition-colors focus:outline-none",
              isInteractive && [
                "cursor-pointer",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm",
                "hover:scale-110 transition-transform",
              ],
              !isInteractive && "cursor-default",
            )}
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
            aria-pressed={isInteractive ? star === value : undefined}
            tabIndex={isInteractive ? 0 : -1}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-muted-foreground/40",
                isInteractive && !isFilled && "hover:text-yellow-300",
              )}
            />
          </button>
        );
      })}

      {showValue && (
        <span
          className={cn(
            "ml-1 font-medium text-foreground",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base",
          )}
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/**
 * Display-only star rating for showing averages
 */
interface StarRatingDisplayProps {
  /** Rating value (can be decimal for averages) */
  value: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show numeric value */
  showValue?: boolean;
  /** Additional class names */
  className?: string;
}

export function StarRatingDisplay({
  value,
  size = "md",
  showValue = true,
  className,
}: StarRatingDisplayProps) {
  const fullStars = Math.floor(value);
  const hasHalfStar = value - fullStars >= 0.5;

  return (
    <div
      className={cn("flex items-center", gapClasses[size], className)}
      title={`Avaliação: ${value.toFixed(1)} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= fullStars;
        const isHalf = star === fullStars + 1 && hasHalfStar;

        return (
          <div key={star} className="relative">
            {/* Background star (empty) */}
            <Star
              className={cn(
                sizeClasses[size],
                "fill-transparent text-muted-foreground/40",
              )}
            />

            {/* Filled star (full or partial) */}
            {(isFull || isHalf) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? "50%" : "100%" }}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    "fill-yellow-400 text-yellow-400",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      {showValue && (
        <span
          className={cn(
            "ml-1 font-medium text-foreground",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base",
          )}
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
