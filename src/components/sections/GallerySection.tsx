"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  GALLERY_CATEGORIES,
  GALLERY_ITEMS,
  type GalleryItem,
} from "@/constants/gallery";
import { ArrowLeftRight, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

export function GallerySection() {
  const t = useTranslations("gallery");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [showBefore, setShowBefore] = useState(true);
  // Estado para controlar qual imagem mostrar no grid (mobile-friendly)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 px-2">
          {GALLERY_CATEGORIES.map((category) => (
            <Button
              key={category.value}
              variant={
                selectedCategory === category.value ? "default" : "outline"
              }
              onClick={() => setSelectedCategory(category.value)}
              className="transition-all min-h-[44px] text-sm sm:text-base px-4 sm:px-6"
            >
              {t(`categories.${category.labelKey}`)}
            </Button>
          ))}
        </div>

        {/* Grid de Imagens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((item) => {
            const isHovered = hoveredItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer rounded-lg border bg-card text-card-foreground shadow-sm text-left"
                onClick={() => {
                  setLightboxItem(item);
                  setShowBefore(true);
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onTouchStart={() => {
                  // Alterna entre antes/depois no touch
                  setHoveredItem(isHovered ? null : item.id);
                }}
              >
                <div className="p-0 relative">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {/* Before Image */}
                    <Image
                      src={item.before}
                      alt={`${t("beforeAlt")} - ${item.service}`}
                      fill
                      className="object-cover absolute inset-0 transition-opacity duration-300"
                      style={{ opacity: isHovered ? 0 : 1 }}
                    />
                    {/* After Image */}
                    <Image
                      src={item.after}
                      alt={`${t("afterAlt")} - ${item.service}`}
                      fill
                      className="object-cover absolute inset-0 transition-opacity duration-300"
                      style={{ opacity: isHovered ? 1 : 0 }}
                    />

                    {/* Overlay - sempre visível no mobile, hover no desktop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 opacity-100" />

                    {/* Badge Antes/Depois */}
                    <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 bg-background/90 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
                      <ArrowLeftRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className={isHovered ? "hidden" : "inline"}>
                        {t("before")}
                      </span>
                      <span className={isHovered ? "inline" : "hidden"}>
                        {t("after")}
                      </span>
                    </div>

                    {/* Service Label - sempre visível no mobile */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 text-white transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 opacity-100">
                      <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8 pb-3 px-3 sm:pt-10 sm:pb-4 sm:px-4">
                        <p className="font-semibold text-base sm:text-lg mb-1">
                          {item.service}
                        </p>
                        <p className="text-xs sm:text-sm text-white/80">
                          {t("clickToView")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("noResults")}</p>
          </div>
        )}
      </div>

      {/* Lightbox usando Dialog do shadcn/ui */}
      <Dialog
        open={!!lightboxItem}
        onOpenChange={(open) => {
          if (!open) {
            setLightboxItem(null);
            setShowBefore(true);
          }
        }}
      >
        {lightboxItem && (
          <DialogPortal>
            {/* Overlay customizado com fundo mais escuro */}
            <DialogOverlay className="bg-black/95" />
            {/* Content customizado */}
            <DialogPrimitive.Content
              className={cn(
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] p-4 sm:p-6 bg-transparent border-none shadow-none duration-200",
              )}
              onPointerDownOutside={() => {
                // Permitir fechar ao clicar fora
                setLightboxItem(null);
                setShowBefore(true);
              }}
            >
              <DialogTitle className="sr-only">
                {lightboxItem.service} - {t("before")} / {t("after")}
              </DialogTitle>

              <div className="w-full">
                {/* Header com título e botões */}
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                    {lightboxItem.service}
                  </h3>
                  <div className="flex justify-center gap-2 sm:gap-4">
                    <Button
                      variant={showBefore ? "default" : "outline"}
                      onClick={() => setShowBefore(true)}
                      className={`min-h-[44px] px-4 sm:px-6 text-sm sm:text-base ${
                        !showBefore
                          ? "text-white border-white/50 hover:bg-white/10"
                          : ""
                      }`}
                    >
                      {t("before")}
                    </Button>
                    <Button
                      variant={!showBefore ? "default" : "outline"}
                      onClick={() => setShowBefore(false)}
                      className={`min-h-[44px] px-4 sm:px-6 text-sm sm:text-base ${
                        showBefore
                          ? "text-white border-white/50 hover:bg-white/10"
                          : ""
                      }`}
                    >
                      {t("after")}
                    </Button>
                  </div>
                </div>

                {/* Imagem */}
                <div className="relative w-full aspect-[4/3] sm:aspect-[4/3] rounded-lg overflow-hidden bg-black/50">
                  <Image
                    src={showBefore ? lightboxItem.before : lightboxItem.after}
                    alt={`${showBefore ? t("beforeAlt") : t("afterAlt")} - ${lightboxItem.service}`}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPortal>
        )}
      </Dialog>
    </section>
  );
}
