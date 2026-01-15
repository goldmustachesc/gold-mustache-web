/**
 * Configuração centralizada da barbearia
 *
 * Este arquivo é a fonte única de verdade para todos os dados da empresa.
 * Serviços, barbeiros e horários são gerenciados no banco de dados.
 */

export const barbershopConfig = {
  // ============================================
  // Dados da Empresa (como no Inbarber)
  // ============================================
  name: "Gold Mustache Barbearia",
  shortName: "Gold Mustache",
  tagline: "Tradição e Estilo Masculino",
  description:
    "Barbearia tradicional em Itapema-SC com mais de 6 anos de experiência. Cortes masculinos clássicos e modernos, barba completa e degradê navalhado.",

  // ============================================
  // Endereço
  // ============================================
  address: {
    street: "R. 115",
    number: "79",
    neighborhood: "Centro",
    city: "Itapema",
    state: "SC",
    zipCode: "88220-000",
    country: "BR",
    /** Endereço formatado para exibição */
    full: "R. 115, 79 - Centro, Itapema - SC, 88220-000",
    /** Endereço com nome da barbearia */
    withName:
      "R. 115, 79 - Centro, Itapema - SC, 88220-000 - Gold Mustache Barbearia",
  },

  // ============================================
  // Coordenadas (Google Maps)
  // ============================================
  coordinates: {
    lat: -27.0923025919406,
    lng: -48.611896766062245,
  },

  // ============================================
  // Contato Principal
  // ============================================
  contact: {
    phone: "47 98904-6178",
    whatsapp: "+5547989046178",
    email: "contato@goldmustachebarbearia.com.br",
  },

  // ============================================
  // Contatos dos Barbeiros (até migrar pro DB)
  // ============================================
  barberContacts: {
    vitor: {
      phone: "47 98882-8032",
      whatsapp: "+5547988828032",
    },
    joao: {
      phone: "47 99953-8340",
      whatsapp: "+5547999538340",
    },
    david: {
      phone: "51 98594-7566",
      whatsapp: "+5551985947566",
    },
  },

  // ============================================
  // Redes Sociais
  // ============================================
  social: {
    instagram: {
      main: "@goldmustachebarbearia",
      store: "@_goldlab",
      mainUrl: "https://instagram.com/goldmustachebarbearia",
      storeUrl: "https://instagram.com/_goldlab",
    },
    googleMaps:
      "https://www.google.com/maps/search/?api=1&query=Gold+Mustache+Barbearia+Itapema",
  },

  // ============================================
  // Booking Externo (Inbarber)
  // ============================================
  externalBooking: {
    inbarberUrl:
      "https://chat.inbarberapp.com/?id=6c060e9d-672d-4f39-bbc4-fac594f4cc28",
  },

  // ============================================
  // Horários Padrão (referência, real vem do DB)
  // ============================================
  defaultHours: {
    weekdays: { open: "10:00", close: "20:00" },
    saturday: { open: "10:00", close: "20:00" },
    sunday: null, // Fechado
  },

  // ============================================
  // Branding
  // ============================================
  foundingYear: 2018,
  colors: {
    gold: "oklch(0.65 0.15 85)",
    darkGold: "oklch(0.55 0.15 85)",
    lightGold: "oklch(0.75 0.12 85)",
    dark: "oklch(0.12 0.02 85)",
    lightDark: "oklch(0.25 0.02 85)",
  },

  // ============================================
  // Combo em Destaque (Corte + Barba)
  // ============================================
  featuredCombo: {
    originalPrice: 115,
    discountedPrice: 100,
  },

  // ============================================
  // Analytics
  // ============================================
  analytics: {
    googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || "",
  },
} as const;

// Tipos exportados para uso em outros arquivos
export type BarbershopConfig = typeof barbershopConfig;
export type BarbershopAddress = typeof barbershopConfig.address;
export type BarbershopCoordinates = typeof barbershopConfig.coordinates;
export type BarbershopContact = typeof barbershopConfig.contact;
export type BarbershopSocial = typeof barbershopConfig.social;
