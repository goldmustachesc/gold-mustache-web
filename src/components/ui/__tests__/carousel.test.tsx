import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../carousel";

const emblaMocks = vi.hoisted(() => {
  const mockApi = {
    on: vi.fn(),
    off: vi.fn(),
    canScrollPrev: vi.fn(() => false),
    canScrollNext: vi.fn(() => true),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
  };

  return {
    mockApi,
    refCallback: vi.fn(),
  };
});

vi.mock("embla-carousel-react", () => ({
  default: vi.fn(() => [emblaMocks.refCallback, emblaMocks.mockApi]),
}));

describe("Carousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emblaMocks.mockApi.canScrollPrev.mockReturnValue(false);
    emblaMocks.mockApi.canScrollNext.mockReturnValue(true);
  });

  it("expõe api via setApi quando fornecido", async () => {
    const setApi = vi.fn();

    render(
      <Carousel setApi={setApi}>
        <CarouselContent>
          <CarouselItem>Slide A</CarouselItem>
          <CarouselItem>Slide B</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    await waitFor(() => {
      expect(setApi).toHaveBeenCalledWith(emblaMocks.mockApi);
    });
  });

  it("registra listeners de reInit e select no embla", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(emblaMocks.mockApi.on).toHaveBeenCalledWith(
      "reInit",
      expect.any(Function),
    );
    expect(emblaMocks.mockApi.on).toHaveBeenCalledWith(
      "select",
      expect.any(Function),
    );
  });

  it("dispara scrollNext ao pressionar ArrowRight na seção", async () => {
    const user = userEvent.setup();
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    const region = screen.getByRole("region", { name: "carousel" });
    region.focus();
    await user.keyboard("{ArrowRight}");

    expect(emblaMocks.mockApi.scrollNext).toHaveBeenCalled();
  });

  it("dispara scrollPrev ao pressionar ArrowLeft na seção", async () => {
    const user = userEvent.setup();
    emblaMocks.mockApi.canScrollPrev.mockReturnValue(true);

    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    const region = screen.getByRole("region", { name: "carousel" });
    region.focus();
    await user.keyboard("{ArrowLeft}");

    expect(emblaMocks.mockApi.scrollPrev).toHaveBeenCalled();
  });

  it("aciona botões anterior e próximo", async () => {
    const user = userEvent.setup();
    emblaMocks.mockApi.canScrollPrev.mockReturnValue(true);

    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );

    await user.click(screen.getByRole("button", { name: /previous slide/i }));
    expect(emblaMocks.mockApi.scrollPrev).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next slide/i }));
    expect(emblaMocks.mockApi.scrollNext).toHaveBeenCalled();
  });

  it("desabilita anterior quando canScrollPrev é false", () => {
    emblaMocks.mockApi.canScrollPrev.mockReturnValue(false);

    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
      </Carousel>,
    );

    expect(
      screen.getByRole("button", { name: /previous slide/i }),
    ).toBeDisabled();
  });

  it("aplica layout vertical nos itens e no botão próximo", () => {
    render(
      <Carousel orientation="vertical">
        <CarouselContent>
          <CarouselItem>A</CarouselItem>
          <CarouselItem>B</CarouselItem>
        </CarouselContent>
        <CarouselNext />
      </Carousel>,
    );

    expect(screen.getByRole("button", { name: /next slide/i })).toHaveClass(
      "-bottom-12",
    );
  });

  it("lança quando CarouselContent é usado fora do Carousel", () => {
    expect(() =>
      render(
        <CarouselContent>
          <div />
        </CarouselContent>,
      ),
    ).toThrow("useCarousel must be used within a <Carousel />");
  });
});
