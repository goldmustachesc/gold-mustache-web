import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
  AccountFilters,
  defaultAccountFiltersState,
} from "@/components/admin/loyalty/AccountFilters";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `filters.${key}`,
}));

function ControlledFilters() {
  const [filters, setFilters] = useState(defaultAccountFiltersState);
  return (
    <>
      <AccountFilters filters={filters} onChange={setFilters} />
      <span data-testid="filter-state">{JSON.stringify(filters)}</span>
    </>
  );
}

describe("AccountFilters", () => {
  it("renderiza e permite buscar por texto", async () => {
    const user = userEvent.setup();
    render(<ControlledFilters />);

    expect(screen.getByTestId("account-filters")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "ana");

    const state = screen.getByTestId("filter-state").textContent ?? "";
    expect(state).toContain("ana");
    expect(state).toContain('"search":"ana"');
  });

  it("emite alteração de nível ao clicar em Prata", async () => {
    const user = userEvent.setup();
    render(<ControlledFilters />);

    await user.click(
      screen.getByRole("button", { name: "filters.tier.SILVER" }),
    );

    const state = screen.getByTestId("filter-state").textContent ?? "";
    expect(state).toContain('"tier":"SILVER"');
  });
});
