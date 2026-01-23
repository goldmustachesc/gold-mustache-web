"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeedbackCard, FeedbackEmptyState } from "./FeedbackCard";
import { FeedbackStatsGrid } from "./FeedbackStats";
import { StarRatingDisplay } from "@/components/ui/star-rating";
import {
  useAdminFeedbacks,
  useAdminFeedbackStats,
  useBarberRanking,
} from "@/hooks/useFeedback";
import type { FeedbackFilters } from "@/types/feedback";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Loader2,
  Star,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminFeedbacksPageProps {
  locale: string;
  barbers: { id: string; name: string }[];
}

export function AdminFeedbacksPage({
  locale,
  barbers,
}: AdminFeedbacksPageProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const pageSize = 20;

  const { data: feedbacksData, isLoading: feedbacksLoading } =
    useAdminFeedbacks(filters, page, pageSize);

  const { data: stats, isLoading: statsLoading } = useAdminFeedbackStats();
  const { data: ranking, isLoading: rankingLoading } = useBarberRanking();

  const isLoading = feedbacksLoading || statsLoading || rankingLoading;

  const handleFilterChange = (
    key: keyof FeedbackFilters,
    value: string | undefined,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (feedbacksData && page < feedbacksData.totalPages) {
      setPage(page + 1);
    }
  };

  const getRankingIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-400" />;
    if (index === 1) return <Crown className="h-4 w-4 text-zinc-400" />;
    if (index === 2) return <Crown className="h-4 w-4 text-amber-700" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 py-4">
          <Link href={`/${locale}/dashboard`}>
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
              Avaliações dos Clientes
            </h1>
            <p className="text-sm text-zinc-400">
              Visão geral de todas as avaliações
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            {stats && <FeedbackStatsGrid stats={stats} />}

            {/* Barber Ranking */}
            {ranking && ranking.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Ranking dos Barbeiros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ranking.slice(0, 5).map((barber, index) => (
                      <Link
                        key={barber.barberId}
                        href={`/${locale}/admin/barbeiros/${barber.barberId}/feedbacks`}
                        className="block"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                            "hover:bg-zinc-800/50",
                            index === 0 &&
                              "bg-yellow-500/5 border border-yellow-500/20",
                          )}
                        >
                          <span className="text-sm font-bold text-zinc-500 w-6 text-center">
                            {index + 1}º
                          </span>

                          <Avatar className="h-10 w-10">
                            <AvatarImage src={barber.avatarUrl || undefined} />
                            <AvatarFallback className="bg-zinc-700">
                              {barber.barberName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {barber.barberName}
                              </p>
                              {getRankingIcon(index)}
                            </div>
                            <p className="text-xs text-zinc-400">
                              {barber.totalFeedbacks}{" "}
                              {barber.totalFeedbacks === 1
                                ? "avaliação"
                                : "avaliações"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <StarRatingDisplay
                              value={barber.averageRating}
                              size="sm"
                              showValue={true}
                            />
                            <ExternalLink className="h-4 w-4 text-zinc-500" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={filters.barberId || "all"}
                onValueChange={(v) => handleFilterChange("barberId", v)}
              >
                <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Todos os barbeiros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os barbeiros</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.rating?.toString() || "all"}
                onValueChange={(v) =>
                  handleFilterChange("rating", v === "all" ? undefined : v)
                }
              >
                <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Todas as notas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as notas</SelectItem>
                  <SelectItem value="5">5 estrelas</SelectItem>
                  <SelectItem value="4">4 estrelas</SelectItem>
                  <SelectItem value="3">3 estrelas</SelectItem>
                  <SelectItem value="2">2 estrelas</SelectItem>
                  <SelectItem value="1">1 estrela</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedbacks List */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-200">
                Todas as Avaliações
                {feedbacksData && feedbacksData.total > 0 && (
                  <span className="text-sm font-normal text-zinc-400 ml-2">
                    ({feedbacksData.total})
                  </span>
                )}
              </h2>

              {feedbacksData && feedbacksData.feedbacks.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {feedbacksData.feedbacks.map((feedback) => (
                    <FeedbackCard
                      key={feedback.id}
                      feedback={feedback}
                      showBarber={true}
                    />
                  ))}
                </div>
              ) : (
                <FeedbackEmptyState
                  message="Nenhuma avaliação encontrada"
                  description="Quando os clientes avaliarem os atendimentos, elas aparecerão aqui."
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
