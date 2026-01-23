"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeedbackCard, FeedbackEmptyState } from "./FeedbackCard";
import { FeedbackStats } from "./FeedbackStats";
import {
  useBarberFeedbacks,
  useBarberFeedbackStats,
} from "@/hooks/useFeedback";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star,
} from "lucide-react";

interface BarberFeedbacksPageProps {
  locale: string;
  barberName: string;
}

export function BarberFeedbacksPage({
  locale,
  barberName,
}: BarberFeedbacksPageProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: feedbacksData, isLoading: feedbacksLoading } =
    useBarberFeedbacks(page, pageSize);

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
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center gap-4 px-4 py-4">
          <Link href={`/${locale}/barbeiro`}>
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Minhas Avaliações
            </h1>
            <p className="text-sm text-zinc-400">{barberName}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <span className="text-sm text-zinc-400">
                    Página {page} de {feedbacksData.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={page >= feedbacksData.totalPages}
                    className="border-zinc-700 hover:bg-zinc-800"
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
