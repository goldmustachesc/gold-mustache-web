"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRatingDisplay } from "@/components/ui/star-rating";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackStats as FeedbackStatsType } from "@/types/feedback";

interface FeedbackStatsProps {
  stats: FeedbackStatsType;
  /** Optional title */
  title?: string;
  /** Compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function FeedbackStats({
  stats,
  title = "Suas Avaliações",
  compact = false,
  className,
}: FeedbackStatsProps) {
  const { totalFeedbacks, averageRating, ratingDistribution } = stats;

  // Calculate percentage for each rating
  const getPercentage = (count: number) => {
    if (totalFeedbacks === 0) return 0;
    return Math.round((count / totalFeedbacks) * 100);
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {averageRating > 0 ? averageRating.toFixed(1) : "-"}
                  </span>
                  <StarRatingDisplay
                    value={averageRating}
                    size="sm"
                    showValue={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalFeedbacks}{" "}
                  {totalFeedbacks === 1 ? "avaliação" : "avaliações"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold">
              {averageRating > 0 ? averageRating.toFixed(1) : "-"}
            </div>
            <StarRatingDisplay
              value={averageRating}
              size="md"
              showValue={false}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {totalFeedbacks}{" "}
              {totalFeedbacks === 1 ? "avaliação" : "avaliações"}
            </p>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count =
                ratingDistribution[rating as keyof typeof ratingDistribution];
              const percentage = getPercentage(count);

              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-3">{rating}</span>
                  <Star className="h-3 w-3 text-yellow-400" />
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of stat cards for dashboard overview
 */
interface FeedbackStatsGridProps {
  stats: FeedbackStatsType;
  className?: string;
}

export function FeedbackStatsGrid({
  stats,
  className,
}: FeedbackStatsGridProps) {
  const { totalFeedbacks, averageRating, ratingDistribution } = stats;

  const positiveCount = ratingDistribution[4] + ratingDistribution[5];
  const positivePercentage =
    totalFeedbacks > 0 ? Math.round((positiveCount / totalFeedbacks) * 100) : 0;

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4", className)}>
      {/* Average Rating */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {averageRating > 0 ? averageRating.toFixed(1) : "-"}
              </p>
              <p className="text-xs text-muted-foreground">Média geral</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Feedbacks */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFeedbacks}</p>
              <p className="text-xs text-muted-foreground">
                Total de avaliações
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positive Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{positivePercentage}%</p>
              <p className="text-xs text-muted-foreground">
                Avaliações positivas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
