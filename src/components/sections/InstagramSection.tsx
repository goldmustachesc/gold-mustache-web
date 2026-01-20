"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BRAND } from "@/constants/brand";
import type { InstagramPost } from "@/types/instagram";
import { ExternalLink, Heart, Instagram, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const mockInstagramPosts: InstagramPost[] = [
  {
    id: "1",
    image: "/images/ig/post-1.jpg",
    caption:
      "Agenda aberta para transformar seu visual na Barbearia Gold Mustache! 💈✂️ #goldmustache #barbearia",
    url: "https://www.instagram.com/p/C4d6isbPcrv/",
  },
  {
    id: "2",
    image: "/images/ig/post-2.jpg",
    caption:
      "✂️ Agende já o seu horário na Barbearia Gold Mustache! 💈 #barba #estilo",
    url: "https://www.instagram.com/p/C3ntXR2P-OR/",
  },
  {
    id: "3",
    image: "/images/ig/post-3.jpg",
    caption:
      "Experimente a excelência no cuidado com a Barbearia Gold Mustache. 🪑",
    url: "https://www.instagram.com/p/C29pPW7ORnf/",
  },
  {
    id: "4",
    image: "/images/ig/post-4.jpg",
    caption:
      "✨✂️ O tratamento que você merece está aqui na Gold Mustache. Agende seu horário e descubra o cuidado premium que fará você se sentir no topo da elegância. Sua barba, seu estilo, nossa expertise. 💈👑",
    url: "https://www.instagram.com/p/C2A16GsP5rj/",
  },
];

export function InstagramSection() {
  const [posts, setPosts] = useState<InstagramPost[]>(mockInstagramPosts);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInstagramPosts() {
      try {
        const response = await fetch("/api/instagram/posts");

        if (!response.ok) {
          console.warn("Erro ao buscar posts do Instagram, usando fallback");
          setPosts(mockInstagramPosts);
          return;
        }

        const data = await response.json();

        if (data.posts && data.posts.length > 0) {
          setPosts(data.posts);
        } else {
          setPosts(mockInstagramPosts);
        }
      } catch (error) {
        console.warn("Erro ao buscar posts do Instagram:", error);
        setPosts(mockInstagramPosts);
      } finally {
        setIsLoading(false);
      }
    }

    loadInstagramPosts();
  }, []);

  const displayPosts = isLoading ? mockInstagramPosts : posts;
  return (
    <section id="instagram" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Instagram className="h-4 w-4 mr-2" />
            Instagram
          </Badge>
          <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-4">
            Acompanhe no <span className="text-primary">Instagram</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Veja os nossos posts e acompanhe o dia a dia da barbearia.
            Inspiração e qualidade em cada post.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg">
              <a
                href={BRAND.instagram.mainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
              >
                <Instagram className="h-5 w-5" />
                <span>Seguir @goldmustachebarbearia</span>
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
                <span>Produtos @_goldlab</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden mb-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {displayPosts.map((post) => (
                <CarouselItem
                  key={post.id}
                  className="pl-2 md:pl-4 basis-[85%] sm:basis-[70%]"
                >
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                    <CardContent className="p-0 relative">
                      <div className="aspect-square relative overflow-hidden">
                        <Image
                          src={post.image}
                          alt="Instagram post"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="text-white text-center space-y-2">
                            <div className="flex items-center justify-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <Heart className="h-5 w-5 fill-white" />
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="h-5 w-5" />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3"
                              onClick={() => window.open(post.url, "_blank")}
                            >
                              <Instagram className="h-4 w-4 mr-2" />
                              Ver no Instagram
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Caption */}
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.caption}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {displayPosts.map((post) => (
            <Card
              key={post.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-0 relative">
                <div className="aspect-square relative overflow-hidden">
                  <Image
                    src={post.image}
                    alt="Instagram post"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center space-y-2">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-5 w-5 fill-white" />
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-5 w-5" />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => window.open(post.url, "_blank")}
                      >
                        <Instagram className="h-4 w-4 mr-2" />
                        Ver no Instagram
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.caption}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-playfair font-bold mb-4">
              Quer ver mais trabalhos?
            </h3>
            <p className="text-muted-foreground mb-6">
              Siga nossos perfis no Instagram para acompanhar todos os
              trabalhos, novidades e promoções especiais da Gold Mustache.
            </p>
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
      </div>
    </section>
  );
}
