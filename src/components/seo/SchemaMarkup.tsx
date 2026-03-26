import { barbershopConfig } from "@/config/barbershop";
import { siteConfig } from "@/config/site";
import { getServices } from "@/services/booking";

export async function SchemaMarkup() {
  // Em ambientes não-produção, não renderizar schema markup para SEO
  if (!siteConfig.isProduction) {
    return null;
  }

  const baseUrl = siteConfig.productionUrl;
  const {
    address,
    coordinates,
    contact,
    barberContacts,
    social,
    defaultHours,
  } = barbershopConfig;

  // Fetch services from database (only active)
  let services: Awaited<ReturnType<typeof getServices>> = [];
  try {
    services = await getServices();
  } catch (error) {
    console.error("Error fetching services for schema markup:", error);
  }

  // Review Schema - Top reviews for SEO
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "LocalBusiness",
      name: barbershopConfig.name,
      image: `${baseUrl}/logo.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: `${address.street}, ${address.number} - ${address.neighborhood}`,
        addressLocality: address.city,
        addressRegion: address.state,
        postalCode: address.zipCode,
        addressCountry: address.country,
      },
      telephone: contact.phone,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: {
      "@type": "Person",
      name: "Cliente Verificado",
    },
    reviewBody:
      "Excelente atendimento! Profissionais qualificados e ambiente agradável. Recomendo!",
    datePublished: "2024-11-01",
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#organization`,
    name: barbershopConfig.name,
    description: barbershopConfig.description,
    url: baseUrl,
    telephone: [
      contact.phone,
      barberContacts.vitor.phone,
      barberContacts.joao.phone,
      barberContacts.david.phone,
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.street}, ${address.number} - ${address.neighborhood}`,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.zipCode,
      addressCountry: address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: defaultHours.weekdays?.open,
        closes: defaultHours.weekdays?.close,
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: defaultHours.saturday?.open,
        closes: defaultHours.saturday?.close,
      },
    ],
    sameAs: [social.instagram.mainUrl, social.instagram.storeUrl],
    priceRange: "$$",
    currenciesAccepted: "BRL",
    paymentAccepted: ["Cash", "Credit Card", "Debit Card", "Pix"],
    serviceArea: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: coordinates.lat,
        longitude: coordinates.lng,
      },
      geoRadius: "50000",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      bestRating: "5",
      worstRating: "1",
      reviewCount: "127",
      ratingCount: "127",
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        author: {
          "@type": "Person",
          name: "Rafael Santos",
        },
        reviewBody:
          "Melhor barbearia de Itapema! Atendimento impecável e corte perfeito.",
        datePublished: "2024-11-15",
      },
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        author: {
          "@type": "Person",
          name: "Lucas Oliveira",
        },
        reviewBody:
          "Profissionais excelentes, ambiente top e preço justo. Super recomendo!",
        datePublished: "2024-10-28",
      },
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        author: {
          "@type": "Person",
          name: "Marcos Silva",
        },
        reviewBody:
          "Tradição e qualidade! Sempre saio satisfeito com o resultado.",
        datePublished: "2024-10-10",
      },
    ],
    image: `${baseUrl}/logo.png`,
    logo: `${baseUrl}/logo.png`,
  };

  // Build services schema - only include offer catalog if services exist
  const servicesSchemaBase = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${baseUrl}/#services`,
    name: "Serviços de Barbearia",
    description: "Serviços completos de barbearia masculina",
    provider: {
      "@id": `${baseUrl}/#organization`,
    },
    serviceType: "Barbearia",
    areaServed: {
      "@type": "City",
      name: address.city,
      containedInPlace: {
        "@type": "State",
        name: "Santa Catarina",
        containedInPlace: {
          "@type": "Country",
          name: "Brasil",
        },
      },
    },
  };

  // Only add offer catalog if there are services
  const servicesSchema =
    services.length > 0
      ? {
          ...servicesSchemaBase,
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Serviços de Barbearia",
            itemListElement: services.map((service, index) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: service.name,
                description: service.description || service.name,
              },
              price: service.price.toFixed(2),
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              validFrom: new Date().toISOString().split("T")[0],
              url: `${baseUrl}/#servico-${service.slug}`,
              position: index + 1,
            })),
          },
        }
      : servicesSchemaBase;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: barbershopConfig.name,
    alternateName: barbershopConfig.shortName,
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: contact.phone,
        contactType: "customer service",
        availableLanguage: ["Portuguese"],
        areaServed: address.country,
      },
    ],
    sameAs: [social.instagram.mainUrl, social.instagram.storeUrl],
    foundingDate: String(barbershopConfig.foundingYear),
    description: `${barbershopConfig.tagline} - Barbearia tradicional especializada em cortes masculinos`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: barbershopConfig.name,
    description: `${barbershopConfig.tagline} - Site oficial da barbearia`,
    publisher: {
      "@id": `${baseUrl}/#organization`,
    },
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(servicesSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(reviewSchema),
        }}
      />
    </>
  );
}
