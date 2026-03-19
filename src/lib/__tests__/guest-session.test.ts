import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGuestToken,
  getGuestToken,
  hasGuestToken,
  setGuestToken,
} from "../guest-session";

describe("guest-session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persiste e lê o token de convidado", () => {
    expect(getGuestToken()).toBeNull();
    setGuestToken("tok-1");
    expect(getGuestToken()).toBe("tok-1");
    expect(hasGuestToken()).toBe(true);
  });

  it("remove o token", () => {
    setGuestToken("x");
    clearGuestToken();
    expect(getGuestToken()).toBeNull();
    expect(hasGuestToken()).toBe(false);
  });

  it("retorna null e avisa quando o localStorage bloqueia leitura", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(getGuestToken()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("ignora escrita quando o localStorage bloqueia", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    setGuestToken("não-grava");
    expect(warnSpy).toHaveBeenCalled();
  });
});
