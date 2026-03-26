import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyLinkCard } from "../MyLinkCard";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const clipboardMocks = vi.hoisted(() => ({
  writeText: vi.fn(),
}));

const shareMock = vi.hoisted(() => vi.fn());
const openMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code">{value}</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe("MyLinkCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const navigatorPrototype = Object.getPrototypeOf(navigator) as Navigator;

    Object.defineProperty(navigatorPrototype, "share", {
      configurable: true,
      value: shareMock,
    });

    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(
      clipboardMocks.writeText,
    );

    vi.stubGlobal("open", openMock);
  });

  it("copia o link e mostra feedback de sucesso", async () => {
    clipboardMocks.writeText.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MyLinkCard
        bookingUrl="https://goldmustache.com/agendar/carlos"
        barberName="Carlos"
      />,
    );

    await user.click(screen.getByRole("button", { name: /copiar link/i }));

    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalledWith("Link copiado!");
      expect(screen.getAllByText(/copiado/i)[0]).toBeInTheDocument();
    });
  });

  it("mostra erro quando nao consegue copiar o link", async () => {
    clipboardMocks.writeText.mockRejectedValue(new Error("clipboard blocked"));
    const user = userEvent.setup();

    render(
      <MyLinkCard
        bookingUrl="https://goldmustache.com/agendar/carlos"
        barberName="Carlos"
      />,
    );

    await user.click(screen.getByRole("button", { name: /copiar link/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Erro ao copiar link");
    });
  });

  it("compartilha no WhatsApp e no Facebook", async () => {
    const user = userEvent.setup();

    render(
      <MyLinkCard
        bookingUrl="https://goldmustache.com/agendar/carlos"
        barberName="Carlos"
      />,
    );

    await user.click(screen.getByRole("button", { name: /whatsapp/i }));
    await user.click(screen.getByRole("button", { name: /facebook/i }));

    expect(openMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
    expect(openMock).toHaveBeenNthCalledWith(
      2,
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fgoldmustache.com%2Fagendar%2Fcarlos",
      "_blank",
    );
  });

  it("usa navigator.share quando disponivel no compartilhamento expandido", async () => {
    const user = userEvent.setup();
    shareMock.mockResolvedValue(undefined);

    render(
      <MyLinkCard
        bookingUrl="https://goldmustache.com/agendar/carlos"
        barberName="Carlos"
      />,
    );

    await user.click(screen.getByRole("button", { name: /mais/i }));

    expect(shareMock).toHaveBeenCalledWith({
      title: "Agende com Carlos - Gold Mustache",
      text: "Agende seu horário comigo na Gold Mustache! 💈✂️",
      url: "https://goldmustache.com/agendar/carlos",
    });
  });

  it("faz fallback para copiar link quando navigator.share nao existe", async () => {
    const user = userEvent.setup();
    clipboardMocks.writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });

    render(
      <MyLinkCard
        bookingUrl="https://goldmustache.com/agendar/carlos"
        barberName="Carlos"
      />,
    );

    await user.click(screen.getByRole("button", { name: /mais/i }));

    await waitFor(() => {
      expect(clipboardMocks.writeText).toHaveBeenCalledWith(
        "https://goldmustache.com/agendar/carlos",
      );
    });
  });

  it("abre o dialog com QR Code", async () => {
    const user = userEvent.setup();

    render(
      <MyLinkCard
        bookingUrl="https://goldmustache.com/agendar/carlos"
        barberName="Carlos"
      />,
    );

    await user.click(screen.getByRole("button", { name: /ver qr code/i }));

    expect(screen.getByText("QR Code do seu link")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toHaveTextContent(
      "https://goldmustache.com/agendar/carlos",
    );
  });
});
