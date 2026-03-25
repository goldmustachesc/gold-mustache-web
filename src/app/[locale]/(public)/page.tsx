import { HeroSection } from "@/components/sections/HeroSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { isFeatureEnabled } from "@/services/feature-flags";
import dynamic from "next/dynamic";

const SectionSkeleton = () => (
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
);

const TestimonialsSection = dynamic(
  () =>
    import("@/components/sections/TestimonialsSection").then((mod) => ({
      default: mod.TestimonialsSection,
    })),
  { loading: SectionSkeleton },
);

const InstagramSection = dynamic(
  () =>
    import("@/components/sections/InstagramSection").then((mod) => ({
      default: mod.InstagramSection,
    })),
  { loading: SectionSkeleton },
);

const EventsSection = dynamic(
  () =>
    import("@/components/custom/EventsSection").then((mod) => ({
      default: mod.EventsSection,
    })),
  { loading: SectionSkeleton },
);

const ContactSection = dynamic(
  () =>
    import("@/components/sections/ContactSection").then((mod) => ({
      default: mod.ContactSection,
    })),
  { loading: SectionSkeleton },
);

const SponsorsSection = dynamic(
  () =>
    import("@/components/sections/SponsorsSection").then((mod) => ({
      default: mod.SponsorsSection,
    })),
  { loading: SectionSkeleton },
);

const GallerySection = dynamic(
  () =>
    import("@/components/sections/GallerySection").then((mod) => ({
      default: mod.GallerySection,
    })),
  { loading: SectionSkeleton },
);

const FAQSection = dynamic(
  () =>
    import("@/components/sections/FAQSection").then((mod) => ({
      default: mod.FAQSection,
    })),
  { loading: SectionSkeleton },
);

export default async function Home() {
  const showEvents = await isFeatureEnabled("eventsSection");

  return (
    <div className="flex flex-col">
      <HeroSection />
      <ServicesSection />
      <TeamSection />
      <TestimonialsSection />
      <InstagramSection />
      {showEvents && <EventsSection />}
      <ContactSection />
      <SponsorsSection />
      <GallerySection />
      <FAQSection />
    </div>
  );
}
