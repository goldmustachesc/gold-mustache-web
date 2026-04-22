import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistrar } from "../ServiceWorkerRegistrar";

describe("ServiceWorkerRegistrar", () => {
  it("registra o service worker quando a API está disponível", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("/sw.js");
    });
  });
});
