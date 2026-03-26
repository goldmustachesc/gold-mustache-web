"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InstagramPost } from "@/types/instagram";
import { Heart, Instagram, MessageCircle } from "lucide-react";
import Image from "next/image";

export function InstagramPostCard({
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
