import { Badge } from "@/components/ui/badge";
import { BlogCard } from "@/components/ui/blog-card";
import { BLOG_CATEGORIES, BLOG_POSTS } from "@/constants/blog";
import { locales } from "@/i18n/config";
import { BookOpen, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: `${t("title")} | Gold Mustache Barbearia`,
    description: t("description"),
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  // Generate blog list schema
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${t("title")} - Gold Mustache Barbearia`,
    description: t("description"),
    url: `https://www.goldmustachebarbearia.com.br/${locale}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Gold Mustache Barbearia",
      logo: {
        "@type": "ImageObject",
        url: "https://www.goldmustachebarbearia.com.br/logo.png",
      },
    },
  };

  const [featuredPost, ...otherPosts] = BLOG_POSTS;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-12">
              <Badge
                variant="outline"
                className="mb-6 px-4 py-1.5 text-sm border-primary/30 dark:border-primary/50"
              >
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                <span className="text-foreground">{t("subtitle")}</span>
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 dark:from-foreground dark:via-foreground dark:to-foreground/70 bg-clip-text">
                  {t("title")}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("description")}
              </p>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2 mb-16">
              {BLOG_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="px-4 py-1.5 text-sm border-border/50 dark:border-border/30"
                >
                  {t(`categories.${category}`)}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Post */}
        <section className="pb-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("featured")}
              </h2>
            </div>
            <BlogCard post={featuredPost} locale={locale} featured />
          </div>
        </section>

        {/* Other Posts */}
        <section className="py-12 pb-24">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("moreArticles")}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherPosts.map((post) => (
                <BlogCard key={post.slug} post={post} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
