import { ContactSection } from "@/components/sections/ContactSection";
import { EventsSection } from "@/components/custom/EventsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { HeroSection } from "@/components/sections/HeroSection";
import { InstagramSection } from "@/components/sections/InstagramSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { SponsorsSection } from "@/components/sections/SponsorsSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import dynamic from "next/dynamic";

// Lazy load FAQ section since it's below the fold
// This improves initial page load performance
const FAQSection = dynamic(
  () =>
    import("@/components/sections/FAQSection").then((mod) => ({
      default: mod.FAQSection,
    })),
  {
    loading: () => (
      <div className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-6 w-32 bg-muted rounded mx-auto mb-4" />
              <div className="h-10 w-64 bg-muted rounded mx-auto mb-4" />
              <div className="h-6 w-96 bg-muted rounded mx-auto" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
);

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <ServicesSection />
      <TeamSection />
      <TestimonialsSection />
      <InstagramSection />
      <EventsSection />
      <ContactSection />
      <SponsorsSection />
      <GallerySection />
      <FAQSection />
    </div>
  );
}
