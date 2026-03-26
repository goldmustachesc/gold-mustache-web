"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackCard, FeedbackEmptyState } from "./FeedbackCard";
import { FeedbackStats } from "./FeedbackStats";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import {
  useBarberFeedbacks,
  useBarberFeedbackStats,
} from "@/hooks/useFeedback";
import { ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";

interface BarberFeedbacksPageProps {
  locale: string;
  barberName: string;
}

export function BarberFeedbacksPage({ locale }: BarberFeedbacksPageProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  usePrivateHeader({
    title: "Minhas Avaliações",
    icon: Star,
    backHref: `/${locale}/barbeiro`,
  });

  const { data: feedbacksData, isLoading: feedbacksLoading } =
    useBarberFeedbacks(page, limit);

  const { data: stats, isLoading: statsLoading } = useBarberFeedbackStats();

  const isLoading = feedbacksLoading || statsLoading;

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (feedbacksData && page < feedbacksData.totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <>
            {/* Stats */}
            {stats && stats.totalFeedbacks > 0 && (
              <FeedbackStats stats={stats} title="Resumo das Avaliações" />
            )}

            {/* Feedbacks List */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-200">
                Avaliações Recentes
                {feedbacksData && feedbacksData.total > 0 && (
                  <span className="text-sm font-normal text-zinc-400 ml-2">
                    ({feedbacksData.total})
                  </span>
                )}
              </h2>

              {feedbacksData && feedbacksData.feedbacks.length > 0 ? (
                <div className="space-y-3">
                  {feedbacksData.feedbacks.map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} />
                  ))}
                </div>
              ) : (
                <FeedbackEmptyState
                  message="Nenhuma avaliação ainda"
                  description="Quando seus clientes avaliarem os atendimentos, elas aparecerão aqui."
                />
              )}

              {/* Pagination */}
              {feedbacksData && feedbacksData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className="border-border hover:bg-accent min-h-11"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Página {page} de {feedbacksData.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={page >= feedbacksData.totalPages}
                    className="border-border hover:bg-accent min-h-11"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
