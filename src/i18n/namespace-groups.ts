export const SHARED_NS = ["common", "navigation", "metadata", "brand"] as const;

export const PUBLIC_NS = [
  ...SHARED_NS,
  "hero",
  "services",
  "faq",
  "gallery",
  "team",
  "testimonials",
  "sponsors",
  "contact",
  "events",
  "footer",
  "instagram",
  "blog",
  "privacy",
] as const;

export const AUTH_NS = [...SHARED_NS, "auth"] as const;

export const BOOKING_NS = [...SHARED_NS, "booking"] as const;

export const PROTECTED_NS = [...SHARED_NS, "profile", "loyalty"] as const;
