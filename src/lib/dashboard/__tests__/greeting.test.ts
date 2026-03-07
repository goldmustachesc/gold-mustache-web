import { describe, expect, it } from "vitest";
import { getGreeting } from "../greeting";

describe("getGreeting", () => {
  it("returns 'Bom dia' before noon", () => {
    expect(getGreeting(new Date(2026, 2, 7, 0))).toBe("Bom dia");
    expect(getGreeting(new Date(2026, 2, 7, 6))).toBe("Bom dia");
    expect(getGreeting(new Date(2026, 2, 7, 11, 59))).toBe("Bom dia");
  });

  it("returns 'Boa tarde' from noon to before 6pm", () => {
    expect(getGreeting(new Date(2026, 2, 7, 12))).toBe("Boa tarde");
    expect(getGreeting(new Date(2026, 2, 7, 15))).toBe("Boa tarde");
    expect(getGreeting(new Date(2026, 2, 7, 17, 59))).toBe("Boa tarde");
  });

  it("returns 'Boa noite' from 6pm onwards", () => {
    expect(getGreeting(new Date(2026, 2, 7, 18))).toBe("Boa noite");
    expect(getGreeting(new Date(2026, 2, 7, 21))).toBe("Boa noite");
    expect(getGreeting(new Date(2026, 2, 7, 23, 59))).toBe("Boa noite");
  });

  it("defaults to current time when no date provided", () => {
    const result = getGreeting();
    expect(["Bom dia", "Boa tarde", "Boa noite"]).toContain(result);
  });
});
