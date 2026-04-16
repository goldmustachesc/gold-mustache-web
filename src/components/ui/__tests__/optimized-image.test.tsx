import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptimizedImage } from "../optimized-image";

vi.mock("next/image", () => ({
  default: ({
    onLoad,
    onError,
    alt,
    src,
    ...rest
  }: {
    onLoad?: () => void;
    onError?: () => void;
    alt: string;
    src: string;
    className?: string;
  }) => (
    // biome-ignore lint/performance/noImgElement: mock stub for tests
    <img
      data-testid="next-image"
      alt={alt}
      src={String(src)}
      onLoad={onLoad}
      onError={onError}
      {...rest}
    />
  ),
}));

describe("OptimizedImage", () => {
  it("converte src para webp e remove placeholder após load", () => {
    render(<OptimizedImage src="/foto.png" alt="Foto" className="rounded" />);

    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "/foto.webp");

    expect(document.querySelector(".animate-pulse")).toBeTruthy();

    fireEvent.load(img);

    expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("não renderiza placeholder quando showPlaceholder é false", () => {
    render(<OptimizedImage src="/foto.jpg" alt="F" showPlaceholder={false} />);

    expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("após erro usa fallback e deriva webp do fallback", () => {
    render(
      <OptimizedImage src="/missing.png" alt="Alt" fallback="/backup.jpeg" />,
    );

    const img = screen.getByTestId("next-image");
    fireEvent.error(img);

    expect(img).toHaveAttribute("src", "/backup.webp");
  });
});
