import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VideoEmbed } from "../video-embed";

describe("VideoEmbed", () => {
  it("renderiza iframe com URL segura do youtube", () => {
    render(<VideoEmbed videoId="abc123" title="Vídeo institucional" />);

    const iframe = screen.getByTitle("Vídeo institucional");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abc123",
    );
    expect(iframe).toHaveAttribute("loading", "lazy");
    expect(iframe).toHaveAttribute(
      "referrerpolicy",
      "strict-origin-when-cross-origin",
    );
  });
});
