import type { InstagramCacheData } from "@/types/instagram";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Posts mockados como fallback
const MOCK_POSTS = [
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

/**
 * GET /api/instagram/posts
 * Retorna os posts do Instagram do cache local
 */
export async function GET(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("api", clientId);
    if (!rateLimitResult.success) {
      const res = apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
      res.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      res.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      return res;
    }

    const cacheFilePath = path.join(
      process.cwd(),
      "public",
      "data",
      "instagram-cache.json",
    );

    // Tentar ler o cache
    const cacheData = await readFile(cacheFilePath, "utf-8");
    const cache: InstagramCacheData = JSON.parse(cacheData);

    // Validar se o cache tem posts
    if (cache.posts && cache.posts.length > 0) {
      const res = apiSuccess({
        posts: cache.posts,
        lastUpdated: cache.lastUpdated,
        source: cache.source,
      });
      res.headers.set(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=86400",
      );
      return res;
    }

    // Se cache estiver vazio, usar mock
    console.warn("[Instagram API] Cache vazio, usando posts mockados");
    const mockRes = apiSuccess({
      posts: MOCK_POSTS,
      lastUpdated: new Date().toISOString(),
      source: "mock",
    });
    mockRes.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return mockRes;
  } catch (error) {
    // Se cache não existir ou houver erro, retornar mock
    console.warn(
      "[Instagram API] Erro ao ler cache, usando posts mockados:",
      error,
    );

    const fallbackRes = apiSuccess({
      posts: MOCK_POSTS,
      lastUpdated: new Date().toISOString(),
      source: "mock",
    });
    fallbackRes.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return fallbackRes;
  }
}
