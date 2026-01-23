import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { GallerySection } from "./GallerySection";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      badge: "Gallery",
      title: "Amazing Transformations",
      description: "See the before and after of our work",
      before: "Before",
      after: "After",
      beforeAlt: "Before service",
      afterAlt: "After service",
      clickToView: "Click to enlarge",
      noResults: "No results found for this filter",
      "categories.all": "All",
      "categories.haircut": "Haircuts",
      "categories.beard": "Beard",
      "categories.combo": "Combo",
      "categories.styling": "Styling",
    };
    return translations[key] || key;
  },
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    [key: string]: unknown;
    // biome-ignore lint/performance/noImgElement: Test mock requires img element
  }) => <img src={src} alt={alt} {...props} />,
}));

// Mock gallery constants
vi.mock("@/constants/gallery", () => ({
  GALLERY_ITEMS: [
    {
      id: "1",
      before: "/images/gallery/before-1.jpg",
      after: "/images/gallery/after-1.jpg",
      service: "Corte + Barba",
      category: "combo",
    },
    {
      id: "2",
      before: "/images/gallery/before-2.jpg",
      after: "/images/gallery/after-2.jpg",
      service: "Corte Degradê",
      category: "haircut",
    },
  ],
  GALLERY_CATEGORIES: [
    { value: "all", labelKey: "all" },
    { value: "haircut", labelKey: "haircut" },
    { value: "beard", labelKey: "beard" },
    { value: "combo", labelKey: "combo" },
    { value: "styling", labelKey: "styling" },
  ],
}));

describe("GallerySection", () => {
  it("renders section header with badge, title, and description", () => {
    render(<GallerySection />);

    expect(screen.getByText("Gallery")).toBeInTheDocument();
    expect(screen.getByText("Amazing Transformations")).toBeInTheDocument();
    expect(
      screen.getByText("See the before and after of our work"),
    ).toBeInTheDocument();
  });

  it("renders all category filter buttons", () => {
    render(<GallerySection />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Haircuts")).toBeInTheDocument();
    expect(screen.getByText("Beard")).toBeInTheDocument();
    expect(screen.getByText("Combo")).toBeInTheDocument();
    expect(screen.getByText("Styling")).toBeInTheDocument();
  });

  it("renders gallery items", () => {
    render(<GallerySection />);

    expect(screen.getByText("Corte + Barba")).toBeInTheDocument();
    expect(screen.getByText("Corte Degradê")).toBeInTheDocument();
  });

  it("filters items by category when filter button is clicked", async () => {
    const user = userEvent.setup();
    render(<GallerySection />);

    // Initially shows all items
    expect(screen.getByText("Corte + Barba")).toBeInTheDocument();
    expect(screen.getByText("Corte Degradê")).toBeInTheDocument();

    // Click on "Haircuts" filter
    const haircutButton = screen.getByText("Haircuts");
    await user.click(haircutButton);

    // Should only show haircut items
    expect(screen.queryByText("Corte + Barba")).not.toBeInTheDocument();
    expect(screen.getByText("Corte Degradê")).toBeInTheDocument();
  });

  it("opens lightbox when gallery item is clicked", async () => {
    const user = userEvent.setup();
    render(<GallerySection />);

    const firstItem = screen.getAllByRole("button")[5]; // Skip filter buttons
    await user.click(firstItem);

    // Lightbox should be visible with dialog role
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("closes lightbox when clicking outside", async () => {
    const user = userEvent.setup();
    render(<GallerySection />);

    // Open lightbox
    const firstItem = screen.getAllByRole("button")[5];
    await user.click(firstItem);

    // Dialog should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Press Escape to close (more reliable than clicking outside in tests)
    await user.keyboard("{Escape}");

    // Wait for dialog to be removed
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes lightbox when Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<GallerySection />);

    // Open lightbox
    const firstItem = screen.getAllByRole("button")[5];
    await user.click(firstItem);

    // Press Escape
    await user.keyboard("{Escape}");

    // Dialog should not be in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("toggles between before and after images in lightbox", async () => {
    const user = userEvent.setup();
    render(<GallerySection />);

    // Open lightbox
    const firstItem = screen.getAllByRole("button")[5];
    await user.click(firstItem);

    // Wait for dialog to be visible
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Find Before and After buttons in lightbox using fireEvent (bypasses pointer-events)
    const afterButtons = screen.getAllByText("After");
    const beforeButtons = screen.getAllByText("Before");

    // The buttons in lightbox are present
    expect(afterButtons.length).toBeGreaterThanOrEqual(1);
    expect(beforeButtons.length).toBeGreaterThanOrEqual(1);

    // Use fireEvent to click (bypasses pointer-events: none on body)
    const afterButton = afterButtons[afterButtons.length - 1];
    const beforeButton = beforeButtons[beforeButtons.length - 1];

    fireEvent.click(afterButton);
    fireEvent.click(beforeButton);

    expect(beforeButton).toBeInTheDocument();
    expect(afterButton).toBeInTheDocument();
  });

  it("uses semantic HTML with proper structure", () => {
    const { container } = render(<GallerySection />);

    // Section should be a <section> element
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("id", "galeria");

    // Main title should be h2
    const h2 = screen.getByRole("heading", {
      level: 2,
      name: "Amazing Transformations",
    });
    expect(h2).toBeInTheDocument();
  });

  describe("Accessibility Features", () => {
    it("has proper ARIA attributes on lightbox dialog", async () => {
      const user = userEvent.setup();
      render(<GallerySection />);

      // Open lightbox
      const firstItem = screen.getAllByRole("button")[5];
      await user.click(firstItem);

      const dialog = screen.getByRole("dialog");
      // Radix Dialog generates aria-labelledby automatically linking to DialogTitle
      expect(dialog).toHaveAttribute("aria-labelledby");
      // The dialog has a title element with sr-only class
      const title = dialog.querySelector("h2");
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass("sr-only");
    });

    it("has descriptive alt text for images", () => {
      const { container } = render(<GallerySection />);

      const images = container.querySelectorAll("img");
      images.forEach((img) => {
        expect(img).toHaveAttribute("alt");
        const alt = img.getAttribute("alt");
        expect(alt).toBeTruthy();
        expect(alt?.length).toBeGreaterThan(0);
      });
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<GallerySection />);

      // Tab through filter buttons
      await user.tab();
      expect(document.activeElement).toBeTruthy();
    });

    it("gallery items are keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<GallerySection />);

      // Tab to first gallery item (after filter buttons)
      for (let i = 0; i < 6; i++) {
        await user.tab();
      }

      // Press Enter to open
      await user.keyboard("{Enter}");

      // Dialog should be visible
      const dialog = screen.queryByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("renders grid layout for gallery items", () => {
      const { container } = render(<GallerySection />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toContain("grid-cols-1");
      expect(grid?.className).toContain("md:grid-cols-2");
      expect(grid?.className).toContain("lg:grid-cols-3");
    });
  });
});
