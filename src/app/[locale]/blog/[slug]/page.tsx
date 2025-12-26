import { Badge } from "@/components/ui/badge";
import { BlogCard } from "@/components/ui/blog-card";
import { ShareButton } from "@/components/ui/share-button";
import { BLOG_POSTS } from "@/constants/blog";
import { locales } from "@/i18n/config";
import { ArrowLeft, Calendar, Clock, Sparkles, User } from "lucide-react";
import { formatLocalizedDateFromIsoDateLike } from "@/utils/datetime";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    for (const post of BLOG_POSTS) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) return { title: "Post not found" };

  const title = t(`posts.${slug}.title`);
  const description = t(`posts.${slug}.excerpt`);

  return {
    title: `${title} | Gold Mustache Blog`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  // Get related posts (same category, excluding current)
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.slug !== slug && p.category === post.category,
  ).slice(0, 2);

  // If not enough related posts, get other posts
  const otherPosts =
    relatedPosts.length < 2
      ? BLOG_POSTS.filter(
          (p) => p.slug !== slug && !relatedPosts.includes(p),
        ).slice(0, 2 - relatedPosts.length)
      : [];

  const suggestedPosts = [...relatedPosts, ...otherPosts];

  const formattedDate = formatLocalizedDateFromIsoDateLike(
    post.publishedAt,
    locale,
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  // Article schema for SEO
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t(`posts.${slug}.title`),
    description: t(`posts.${slug}.excerpt`),
    image: `https://www.goldmustachebarbearia.com.br${post.image}`,
    datePublished: post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Gold Mustache Barbearia",
      logo: {
        "@type": "ImageObject",
        url: "https://www.goldmustachebarbearia.com.br/logo.png",
      },
    },
  };

  // Parse markdown-like content to HTML
  const content = t(`posts.${slug}.content`);
  const formattedContent = content.split("\n\n").map((paragraph, index) => {
    const key = `${slug}-p-${index}-${paragraph.slice(0, 20).replace(/\s/g, "")}`;

    if (paragraph.startsWith("## ")) {
      return (
        <h2
          key={key}
          className="text-2xl md:text-3xl font-bold mt-12 mb-6 text-foreground relative"
        >
          <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full hidden md:block" />
          {paragraph.replace("## ", "")}
        </h2>
      );
    }
    if (paragraph.startsWith("### ")) {
      return (
        <h3
          key={key}
          className="text-xl font-semibold mt-8 mb-4 text-foreground"
        >
          {paragraph.replace("### ", "")}
        </h3>
      );
    }
    if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
      return (
        <p
          key={key}
          className="font-semibold text-primary dark:text-primary mb-3 text-lg"
        >
          {paragraph.replace(/\*\*/g, "")}
        </p>
      );
    }
    return (
      <p
        key={key}
        className="text-muted-foreground mb-6 leading-relaxed text-lg"
      >
        {paragraph}
      </p>
    );
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <main className="min-h-screen bg-background">
        {/* Hero Image */}
        <div className="relative h-[40vh] md:h-[50vh] lg:h-[60vh] w-full overflow-hidden">
          <Image
            src={post.image}
            alt={t(`posts.${slug}.title`)}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          {/* Back button */}
          <div className="absolute top-24 left-0 right-0">
            <div className="container mx-auto px-4">
              <Link
                href={`/${locale}/blog`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("backToBlog")}
              </Link>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="relative -mt-32 md:-mt-40">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Header Card */}
              <header className="bg-card dark:bg-card/95 backdrop-blur-sm rounded-2xl border border-border/50 dark:border-border/30 p-6 md:p-10 shadow-xl dark:shadow-none mb-8">
                <Badge className="mb-6 bg-primary text-primary-foreground font-medium">
                  {t(`categories.${post.category}`)}
                </Badge>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                  {t(`posts.${slug}.title`)}
                </h1>

                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  {t(`posts.${slug}.excerpt`)}
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-muted-foreground pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">
                      {post.author}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>
                      {post.readTime} {t("readTime")}
                    </span>
                  </div>

                  <ShareButton
                    title={t(`posts.${slug}.title`)}
                    url={`https://www.goldmustachebarbearia.com.br/${locale}/blog/${slug}`}
                  />
                </div>
              </header>

              {/* Content */}
              <div className="bg-card dark:bg-card/95 backdrop-blur-sm rounded-2xl border border-border/50 dark:border-border/30 p-6 md:p-10 shadow-lg dark:shadow-none">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  {formattedContent}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent rounded-2xl border border-primary/20 dark:border-primary/30 p-8 md:p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-3 text-foreground">
                  {t("cta.title")}
                </h3>

                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t("cta.description")}
                </p>

                <Link
                  href="https://chat.inbarberapp.com/?id=6c060e9d-672d-4f39-bbc4-fac594f4cc28"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  {t("cta.button")}
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {suggestedPosts.length > 0 && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("keepReading")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {suggestedPosts.map((relatedPost) => (
                    <BlogCard
                      key={relatedPost.slug}
                      post={relatedPost}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
