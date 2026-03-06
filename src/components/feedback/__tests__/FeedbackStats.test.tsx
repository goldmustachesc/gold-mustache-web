import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedbackStats, FeedbackStatsGrid } from "../FeedbackStats";
import type { FeedbackStats as FeedbackStatsType } from "@/types/feedback";

const MOCK_STATS: FeedbackStatsType = {
  totalFeedbacks: 20,
  averageRating: 4.5,
  ratingDistribution: { 1: 0, 2: 1, 3: 2, 4: 7, 5: 10 },
};

const EMPTY_STATS: FeedbackStatsType = {
  totalFeedbacks: 0,
  averageRating: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

describe("FeedbackStats", () => {
  it("displays average rating", () => {
    render(<FeedbackStats stats={MOCK_STATS} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("displays dash when average is 0", () => {
    render(<FeedbackStats stats={EMPTY_STATS} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("displays plural 'avaliações' for multiple feedbacks", () => {
    render(<FeedbackStats stats={MOCK_STATS} />);
    expect(screen.getByText(/20 avaliações/)).toBeInTheDocument();
  });

  it("displays singular 'avaliação' for single feedback", () => {
    const singleStats = { ...MOCK_STATS, totalFeedbacks: 1 };
    render(<FeedbackStats stats={singleStats} />);
    expect(screen.getByText(/1 avaliação$/)).toBeInTheDocument();
  });

  it("renders compact mode", () => {
    render(<FeedbackStats stats={MOCK_STATS} compact={true} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });
});

describe("FeedbackStatsGrid", () => {
  it("displays positive percentage for ratings 4 and 5", () => {
    render(<FeedbackStatsGrid stats={MOCK_STATS} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("displays 0% when no feedbacks", () => {
    render(<FeedbackStatsGrid stats={EMPTY_STATS} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("displays total feedbacks count", () => {
    render(<FeedbackStatsGrid stats={MOCK_STATS} />);
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
