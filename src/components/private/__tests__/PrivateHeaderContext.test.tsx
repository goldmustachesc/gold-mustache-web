import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  PrivateHeaderProvider,
  usePrivateHeader,
  usePrivateHeaderConfig,
  usePrivateSidebarState,
} from "../PrivateHeaderContext";
import type { ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return <PrivateHeaderProvider>{children}</PrivateHeaderProvider>;
}

describe("PrivateHeaderContext", () => {
  describe("usePrivateHeader", () => {
    it("sets and resets title on mount/unmount", () => {
      const { result, unmount } = renderHook(
        () => {
          usePrivateHeader({ title: "Meus Horários" });
          return usePrivateHeaderConfig();
        },
        { wrapper: Wrapper },
      );

      expect(result.current.title).toBe("Meus Horários");

      unmount();
    });

    it("updates config when props change", () => {
      const { result, rerender } = renderHook(
        ({ title }: { title: string }) => {
          usePrivateHeader({ title });
          return usePrivateHeaderConfig();
        },
        { wrapper: Wrapper, initialProps: { title: "Page A" } },
      );

      expect(result.current.title).toBe("Page A");

      rerender({ title: "Page B" });

      expect(result.current.title).toBe("Page B");
    });

    it("supports backHref", () => {
      const { result } = renderHook(
        () => {
          usePrivateHeader({
            title: "Detalhes",
            backHref: "/pt-BR/barbeiro",
          });
          return usePrivateHeaderConfig();
        },
        { wrapper: Wrapper },
      );

      expect(result.current.backHref).toBe("/pt-BR/barbeiro");
    });

    it("defaults to undefined for optional fields", () => {
      const { result } = renderHook(
        () => {
          usePrivateHeader({ title: "Início" });
          return usePrivateHeaderConfig();
        },
        { wrapper: Wrapper },
      );

      expect(result.current.backHref).toBeUndefined();
      expect(result.current.icon).toBeUndefined();
    });
  });

  describe("usePrivateSidebarState", () => {
    it("starts closed", () => {
      const { result } = renderHook(() => usePrivateSidebarState(), {
        wrapper: Wrapper,
      });

      expect(result.current.open).toBe(false);
    });

    it("opens and closes sidebar", () => {
      const { result } = renderHook(() => usePrivateSidebarState(), {
        wrapper: Wrapper,
      });

      act(() => result.current.onOpenChange(true));
      expect(result.current.open).toBe(true);

      act(() => result.current.onOpenChange(false));
      expect(result.current.open).toBe(false);
    });
  });

  describe("context boundary", () => {
    it("throws when usePrivateHeaderConfig is used outside provider", () => {
      expect(() => {
        renderHook(() => usePrivateHeaderConfig());
      }).toThrow();
    });

    it("throws when usePrivateSidebarState is used outside provider", () => {
      expect(() => {
        renderHook(() => usePrivateSidebarState());
      }).toThrow();
    });
  });
});
