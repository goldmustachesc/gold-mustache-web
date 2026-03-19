import { renderHook } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "../query-provider";

describe("QueryProvider", () => {
  it("configura QueryClient com staleTime de 60s", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryProvider>{children}</QueryProvider>
    );

    const { result } = renderHook(() => useQueryClient(), { wrapper });

    expect(result.current.getDefaultOptions().queries?.staleTime).toBe(60_000);
    expect(
      result.current.getDefaultOptions().queries?.refetchOnWindowFocus,
    ).toBe(false);
  });
});
