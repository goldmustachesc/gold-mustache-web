"use client";

import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { ResponsiveCardGrid } from "@/components/shared/ResponsiveCardGrid";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/constants/brand";
import { apiGet } from "@/lib/api/client";
import type { InstagramPost } from "@/types/instagram";
import { ExternalLink, Heart, Instagram, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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

function InstagramPostCard({
  post,
  viewLabel,
}: {
  post: InstagramPost;
  viewLabel: string;
}) {
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full hover:border-primary/30">
      <CardContent className="p-0 relative">
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={post.image}
            alt="Instagram post"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-white text-center space-y-2">
              <div className="flex items-center justify-center space-x-4">
                <Heart className="h-5 w-5 fill-white" />
                <MessageCircle className="h-5 w-5" />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => window.open(post.url, "_blank")}
              >
                <Instagram className="h-4 w-4 mr-2" />
                {viewLabel}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.caption}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InstagramSection() {
  const t = useTranslations("instagram");
  const [posts, setPosts] = useState<InstagramPost[]>(mockInstagramPosts);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInstagramPosts() {
      try {
        const data = await apiGet<{ posts: InstagramPost[] }>(
          "/api/instagram/posts",
        );

        if (data.posts && data.posts.length > 0) {
          setPosts(data.posts);
        } else {
          setPosts(mockInstagramPosts);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[InstagramSection] Failed to fetch posts:", error);
        }
        setPosts(mockInstagramPosts);
      } finally {
        setIsLoading(false);
      }
    }

    loadInstagramPosts();
  }, []);

  const displayPosts = isLoading ? mockInstagramPosts : posts;

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
