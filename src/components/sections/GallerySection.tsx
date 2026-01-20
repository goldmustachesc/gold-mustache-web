"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GALLERY_CATEGORIES,
  GALLERY_ITEMS,
  type GalleryItem,
} from "@/constants/gallery";
import { ArrowLeftRight, Image as ImageIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

export function GallerySection() {
  const t = useTranslations("gallery");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [showBefore, setShowBefore] = useState(true);

  // Handle Escape key to close lightbox
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxItem) {
        setLightboxItem(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [lightboxItem]);

  const filteredItems =
    selectedCategory === "all"
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <section className="py-20 bg-muted/30" id="galeria">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <ImageIcon className="h-4 w-4 mr-2" />
            <span>{t("badge")}</span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {GALLERY_CATEGORIES.map((category) => (
            <Button
              key={category.value}
              variant={
                selectedCategory === category.value ? "default" : "outline"
              }
              onClick={() => setSelectedCategory(category.value)}
              className="transition-all"
            >
              {t(`categories.${category.labelKey}`)}
            </Button>
          ))}
        </div>

        {/* Grid de Imagens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer rounded-lg border bg-card text-card-foreground shadow-sm text-left"
              onClick={() => setLightboxItem(item)}
            >
              <div className="p-0 relative">
                <div className="aspect-[4/3] relative overflow-hidden">
                  {/* Before Image */}
                  <Image
                    src={item.before}
                    alt={`${t("beforeAlt")} - ${item.service}`}
                    fill
                    className="object-cover absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
                  />
                  {/* After Image */}
                  <Image
                    src={item.after}
                    alt={`${t("afterAlt")} - ${item.service}`}
                    fill
                    className="object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Badge Antes/Depois */}
                  <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <ArrowLeftRight className="h-3 w-3" />
                    <span className="group-hover:hidden">{t("before")}</span>
                    <span className="hidden group-hover:inline">
                      {t("after")}
                    </span>
                  </div>

                  {/* Service Label */}
                  <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="font-semibold text-lg">{item.service}</p>
                    <p className="text-sm text-white/80">{t("clickToView")}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("noResults")}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setLightboxItem(null);
            }
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxItem(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="max-w-5xl w-full">
            <div className="text-center mb-6">
              <h3
                id="lightbox-title"
                className="text-2xl font-bold text-white mb-2"
              >
                {lightboxItem.service}
              </h3>
              <div className="flex justify-center gap-4">
                <Button
                  variant={showBefore ? "default" : "outline"}
                  onClick={() => setShowBefore(true)}
                  className={!showBefore ? "text-white border-white/50" : ""}
                >
                  {t("before")}
                </Button>
                <Button
                  variant={!showBefore ? "default" : "outline"}
                  onClick={() => setShowBefore(false)}
                  className={showBefore ? "text-white border-white/50" : ""}
                >
                  {t("after")}
                </Button>
              </div>
            </div>

            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src={showBefore ? lightboxItem.before : lightboxItem.after}
                alt={`${showBefore ? t("beforeAlt") : t("afterAlt")} - ${lightboxItem.service}`}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
