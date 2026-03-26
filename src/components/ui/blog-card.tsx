"use client";

import type { BlogPost } from "@/constants/blog";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Calendar, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "./badge";
import { formatLocalizedDateFromIsoDateLike } from "@/utils/datetime";

interface BlogCardProps {
  post: BlogPost;
  locale: string;
  className?: string;
  featured?: boolean;
}

export function BlogCard({
  post,
  locale,
  className,
  featured = false,
}: BlogCardProps) {
  const t = useTranslations("blog");

  const formattedDate = formatLocalizedDateFromIsoDateLike(
    post.publishedAt,
    locale,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  if (featured) {
    return (
      <Link
        href={`/${locale}/blog/${post.slug}`}
        className={cn(
          "group relative block overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-card to-card/80",
          "border border-border/50 dark:border-border/30",
          "shadow-sm hover:shadow-xl dark:shadow-none",
          "transition-all duration-500 ease-out",
          "hover:border-primary/30 dark:hover:border-primary/40",
          "hover:-translate-y-1",
          className,
        )}
      >
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden">
            <Image
              src={post.image}
              alt={t(`posts.${post.slug}.title`)}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/10" />
            <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-medium shadow-lg">
              {t(`categories.${post.category}`)}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime} {t("readTime")}
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
              {t(`posts.${post.slug}.title`)}
            </h3>

            <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
              {t(`posts.${post.slug}.excerpt`)}
            </p>

            <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all duration-300">
              <span>{t("readMore")}</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/blog/${post.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "bg-card dark:bg-card/50",
        "border border-border/50 dark:border-border/30",
        "shadow-sm hover:shadow-lg dark:shadow-none",
        "transition-all duration-500 ease-out",
        "hover:border-primary/30 dark:hover:border-primary/40",
        "hover:-translate-y-1",
        className,
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={post.image}
          alt={t(`posts.${post.slug}.title`)}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Category Badge */}
        <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-medium shadow-lg backdrop-blur-sm">
          {t(`categories.${post.category}`)}
        </Badge>

        {/* Read time overlay */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-white/90 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <Clock className="h-3 w-3" />
          {post.readTime} {t("readTime")}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3.5 w-3.5" />
          {formattedDate}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {t(`posts.${post.slug}.title`)}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
          {t(`posts.${post.slug}.excerpt`)}
        </p>

        {/* Read More */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all duration-300">
          <span>{t("readMore")}</span>
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
