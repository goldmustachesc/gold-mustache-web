import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClientFeatureFlags } from "@/config/feature-flags";
import { FeatureFlagsProvider } from "@/providers/feature-flags-provider";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const DEFAULT_FLAGS: ClientFeatureFlags = {
  loyaltyProgram: false,
  referralProgram: false,
  eventsSection: true,
};

function Probe() {
  const flags = useFeatureFlags();
  return <pre data-testid="flags">{JSON.stringify(flags)}</pre>;
}

describe("providers/feature-flags-provider", () => {
  it("expoe flags clientSafe para o hook", () => {
    render(
      <FeatureFlagsProvider flags={DEFAULT_FLAGS}>
        <Probe />
      </FeatureFlagsProvider>,
    );

    const raw = screen.getByTestId("flags").textContent;
    const parsed = JSON.parse(raw || "{}") as ClientFeatureFlags;

    expect(parsed.loyaltyProgram).toBe(false);
    expect(parsed.referralProgram).toBe(false);
    expect(parsed.eventsSection).toBe(true);
  });

  it("lanca fora do provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      "useFeatureFlags must be used within FeatureFlagsProvider",
    );
  });
});
