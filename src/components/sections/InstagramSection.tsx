import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { ResponsiveCardGrid } from "@/components/shared/ResponsiveCardGrid";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/constants/brand";
import type { Locale } from "@/i18n/config";
import { getInstagramCache } from "@/lib/instagram-cache";
import type { InstagramPost } from "@/types/instagram";
import { ExternalLink, Instagram } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { InstagramPostCard } from "./InstagramPostCard";

const mockInstagramPosts: InstagramPost[] = [
  {
    id: "1",
    image: "/images/ig/post-1.jpg",
    caption:
      "Agenda aberta para transformar seu visual na Barbearia Gold Mustache! \u{1F488}\u{2702}\u{FE0F} #goldmustache #barbearia",
    url: "https://www.instagram.com/p/C4d6isbPcrv/",
  },
  {
    id: "2",
    image: "/images/ig/post-2.jpg",
    caption:
      "\u{2702}\u{FE0F} Agende j\u{00E1} o seu hor\u{00E1}rio na Barbearia Gold Mustache! \u{1F488} #barba #estilo",
    url: "https://www.instagram.com/p/C3ntXR2P-OR/",
  },
  {
    id: "3",
    image: "/images/ig/post-3.jpg",
    caption:
      "Experimente a excel\u{00EA}ncia no cuidado com a Barbearia Gold Mustache. \u{1FA91}",
    url: "https://www.instagram.com/p/C29pPW7ORnf/",
  },
  {
    id: "4",
    image: "/images/ig/post-4.jpg",
    caption:
      "\u{2728}\u{2702}\u{FE0F} O tratamento que voc\u{00EA} merece est\u{00E1} aqui na Gold Mustache. Agende seu hor\u{00E1}rio e descubra o cuidado premium. \u{1F488}\u{1F451}",
    url: "https://www.instagram.com/p/C2A16GsP5rj/",
  },
];

export const getInstagramPostsCached = unstable_cache(
  async (): Promise<InstagramPost[]> => {
    try {
      const cache = await getInstagramCache();
      if (cache?.posts && cache.posts.length > 0) {
        return cache.posts;
      }
    } catch {
      return mockInstagramPosts;
    }
    return mockInstagramPosts;
  },
  ["instagram-posts"],
  { revalidate: 3600 },
);

export async function InstagramSection() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "instagram" });
  const displayPosts = await getInstagramPostsCached();

  return (
    <SectionLayout
      id="instagram"
      icon={Instagram}
      badge={t("badge")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t("description")}
    >
      <RevealOnScroll delay={0.1}>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button asChild size="lg">
            <a
              href={BRAND.instagram.mainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <Instagram className="h-5 w-5" />
              <span>{t("follow")}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button
            asChild
            variant="default"
            size="lg"
            className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
          >
            <a
              href={BRAND.instagram.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2"
            >
              <Instagram className="h-5 w-5" />
              <span>{t("products")}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </RevealOnScroll>

      <div className="mb-12">
        <ResponsiveCardGrid
          items={displayPosts}
          keyExtractor={(post) => post.id}
          desktopCols={4}
          renderCard={(post) => (
            <InstagramPostCard post={post} viewLabel={t("viewOnInstagram")} />
          )}
        />
      </div>

      <RevealOnScroll delay={0.2}>
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-playfair font-bold mb-4">
              {t("cta.title")}
            </h3>
            <p className="text-muted-foreground mb-6">{t("cta.description")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <a
                  href={BRAND.instagram.mainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  @goldmustachebarbearia
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={BRAND.instagram.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  @_goldlab
                </a>
              </Button>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </SectionLayout>
  );
}
