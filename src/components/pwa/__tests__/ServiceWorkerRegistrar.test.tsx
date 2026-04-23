import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistrar } from "../ServiceWorkerRegistrar";

describe("ServiceWorkerRegistrar", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("registra o service worker em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const register = vi.fn().mockResolvedValue(undefined);
    const getRegistrations = vi.fn().mockResolvedValue([]);

    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register, getRegistrations },
      configurable: true,
    });

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("/sw.js");
    });
  });

  it("remove service workers e cache da aplicação em desenvolvimento", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistration = vi.fn().mockResolvedValue({ unregister });
    const register = vi.fn();
    const keys = vi
      .fn()
      .mockResolvedValue(["gold-mustache-shell-v1", "another-cache"]);
    const deleteCache = vi.fn().mockResolvedValue(true);

    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register, getRegistration },
      configurable: true,
    });
    Object.defineProperty(window, "caches", {
      value: { keys, delete: deleteCache },
      configurable: true,
    });

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => {
      expect(getRegistration).toHaveBeenCalledWith(window.location.href);
      expect(unregister).toHaveBeenCalledTimes(1);
    });

    expect(register).not.toHaveBeenCalled();
    expect(keys).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith("gold-mustache-shell-v1");
    expect(deleteCache).not.toHaveBeenCalledWith("another-cache");
  });
});
