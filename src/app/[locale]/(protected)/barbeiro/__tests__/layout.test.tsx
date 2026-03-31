import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetBarbershopSettings = vi.fn();
const mockResolveBookingMode = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@/services/barbershop-settings", () => ({
  getBarbershopSettings: (...args: unknown[]) =>
    mockGetBarbershopSettings(...args),
}));

vi.mock("@/lib/booking-mode", () => ({
  resolveBookingMode: (...args: unknown[]) => mockResolveBookingMode(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

import BarberLayout from "../layout";

describe("BarberLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children even when public booking mode is external", async () => {
    mockGetBarbershopSettings.mockResolvedValue({
      bookingEnabled: true,
      externalBookingUrl: "https://example.com/book",
    });
    mockResolveBookingMode.mockReturnValue("external");

    const view = await BarberLayout({
      children: <div>Area do barbeiro</div>,
      params: Promise.resolve({ locale: "pt-BR" }),
    });

    render(view);

    expect(screen.getByText("Area do barbeiro")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
