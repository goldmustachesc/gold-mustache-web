import { siteConfig } from "@/config/site";
import { BRAND, SERVICES } from "@/constants/brand";

export function SchemaMarkup() {
  // Em ambientes não-produção, não renderizar schema markup para SEO
  if (!siteConfig.isProduction) {
    return null;
  }

  const baseUrl = siteConfig.productionUrl;

  // Review Schema - Top reviews for SEO
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "LocalBusiness",
      name: BRAND.name,
      image: `${baseUrl}/logo.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "R. 115, 79 - Centro",
        addressLocality: "Itapema",
        addressRegion: "SC",
        postalCode: "88220-000",
        addressCountry: "BR",
      },
      telephone: BRAND.contact.phone,
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
    name: BRAND.name,
    description:
      "Tradição e Estilo Masculino - Barbearia tradicional em Itapema-SC com mais de 6 anos de experiência oferecendo cortes masculinos clássicos e modernos, barba completa e degradê navalhado.",
    url: baseUrl,
    telephone: [
      BRAND.contact.phone,
      BRAND.contactVitor.phone,
      BRAND.contactJoao.phone,
      BRAND.contactDavid.phone,
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "R. 115, 79 - Centro",
      addressLocality: "Itapema",
      addressRegion: "SC",
      postalCode: "88220-000",
      addressCountry: "BR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -27.0897,
      longitude: -48.617,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "20:00",
      },
    ],
    sameAs: [BRAND.instagram.mainUrl, BRAND.instagram.storeUrl],
    priceRange: "$$",
    currenciesAccepted: "BRL",
    paymentAccepted: ["Cash", "Credit Card", "Debit Card", "Pix"],
    serviceArea: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: -27.0897,
        longitude: -48.617,
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

  const servicesSchema = {
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
      name: "Itapema",
      containedInPlace: {
        "@type": "State",
        name: "Santa Catarina",
        containedInPlace: {
          "@type": "Country",
          name: "Brasil",
        },
      },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Serviços de Barbearia",
      itemListElement: SERVICES.map((service, index) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.id,
          description: service.id,
        },
        price: service.price.replace("R$ ", "").replace(",", "."),
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        validFrom: new Date().toISOString().split("T")[0],
        url: `${baseUrl}/#service-${service.id}`,
        position: index + 1,
      })),
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: BRAND.name,
    alternateName: "Gold Mustache",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: BRAND.contact.phone,
        contactType: "customer service",
        availableLanguage: ["Portuguese"],
        areaServed: "BR",
      },
    ],
    sameAs: [BRAND.instagram.mainUrl, BRAND.instagram.storeUrl],
    foundingDate: "2018",
    description:
      "Tradição e Estilo Masculino - Barbearia tradicional especializada em cortes masculinos",
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
    name: BRAND.name,
    description: "Tradição e Estilo Masculino - Site oficial da barbearia",
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
