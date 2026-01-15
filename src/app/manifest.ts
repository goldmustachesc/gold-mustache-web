import { barbershopConfig } from "@/config/barbershop";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${barbershopConfig.name} - ${barbershopConfig.tagline}`,
    short_name: barbershopConfig.shortName,
    description: barbershopConfig.description,
    start_url: "/pt-BR",
    display: "standalone",
    background_color: "#1a1a1a",
    theme_color: "#D4AF37",
    orientation: "portrait-primary",
    scope: "/",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["lifestyle", "business"],
    icons: [
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/logo.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/logo.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
    shortcuts: [
      {
        name: "Agendar Horário",
        short_name: "Agendar",
        description: "Agende seu horário rapidamente",
        url: "/pt-BR#contato",
        icons: [
          {
            src: "/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
        ],
      },
      {
        name: "Ver Serviços",
        short_name: "Serviços",
        description: "Conheça nossos serviços",
        url: "/pt-BR#servicos",
        icons: [
          {
            src: "/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
        ],
      },
      {
        name: "Instagram",
        short_name: "Instagram",
        description: "Veja nossos trabalhos no Instagram",
        url: "/pt-BR#instagram",
        icons: [
          {
            src: "/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
        ],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
