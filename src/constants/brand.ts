export const BRAND = {
  name: "Gold Mustache Barbearia",
  // tagline and location now come from i18n translations
  // Use t('brand.tagline') and t('brand.location')

  analytics: {
    googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || "",
  },

  instagram: {
    main: "@goldmustachebarbearia",
    store: "@_goldlab",
    mainUrl: "https://instagram.com/goldmustachebarbearia",
    storeUrl: "https://instagram.com/_goldlab",
  },

  booking: {
    inbarberUrl:
      "https://chat.inbarberapp.com/?id=6c060e9d-672d-4f39-bbc4-fac594f4cc28",
  },

  contact: {
    phone: "47 98904-6178",
    whatsapp: "+5547989046178",
    // email: 'contato@goldmustache.com', // TODO: Add real email
    address:
      "R. 115, 79 - Centro, Itapema - SC, 88220-000 - Gold Mustache Barbearia",
    coordinates: {
      lat: -27.0923025919406,
      lng: -48.611896766062245,
    },
    googleMapsUrl:
      "https://www.google.com/maps/place/R.+115,+79+-+Centro,+Itapema+-+SC,+88220-000",
  },

  contactVitor: {
    phone: "47 98882-8032",
    whatsapp: "+5547988828032",
    // email: 'contato@goldmustache.com', // TODO: Add real email
    address:
      "R. 115, 79 - Centro, Itapema - SC, 88220-000 - Gold Mustache Barbearia",
  },

  contactJoao: {
    phone: "47 99953-8340",
    whatsapp: "+5547999538340",
    // email: 'contato@goldmustache.com', // TODO: Add real email
    address:
      "R. 115, 79 - Centro, Itapema - SC, 88220-000 - Gold Mustache Barbearia",
  },

  contactDavid: {
    phone: "51 98594-7566",
    whatsapp: "+5551985947566",
    // email: 'contato@goldmustache.com', // TODO: Add real email
    address:
      "R. 115, 79 - Centro, Itapema - SC, 88220-000 - Gold Mustache Barbearia",
  },

  // Business Hours - now come from i18n translations
  // Use t('contact.hours.weekdays'), t('contact.hours.time'), etc.

  // Brand Colors (for use in custom components)
  colors: {
    gold: "oklch(0.65 0.15 85)",
    darkGold: "oklch(0.55 0.15 85)",
    lightGold: "oklch(0.75 0.12 85)",
    dark: "oklch(0.12 0.02 85)",
    lightDark: "oklch(0.25 0.02 85)",
  },

  // Featured combo pricing (Corte + Barba)
  featuredCombo: {
    originalPrice: 115,
    discountedPrice: 100,
  },
} as const;

// Services are now fetched from the database via /api/services
// Use the useServices() hook from @/hooks/useBooking for client-side
// Use getServices() from @/services/booking for server-side
