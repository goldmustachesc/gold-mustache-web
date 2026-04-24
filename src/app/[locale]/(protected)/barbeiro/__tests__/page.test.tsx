import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ locale: "pt-BR" }),
}));

import BarbeiroPage from "../page";

describe("BarbeiroPage (alias)", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("redireciona /barbeiro para /dashboard", async () => {
    render(<BarbeiroPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/pt-BR/dashboard");
    });
  });
});
