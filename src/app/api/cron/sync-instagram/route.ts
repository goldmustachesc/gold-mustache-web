import {
  fetchInstagramPosts,
  validateInstagramConfig,
} from "@/services/instagram";
import type { InstagramCacheData, InstagramPost } from "@/types/instagram";
import { apiSuccess, apiError } from "@/lib/api/response";
import { API_CONFIG } from "@/config/api";
import { setInstagramCache } from "@/lib/instagram-cache";
import { isRedisConfigured } from "@/lib/redis";

const { maxRetries, postsLimit, retryBaseDelayMs } = API_CONFIG.instagram;

/**
 * POST /api/cron/sync-instagram
 * Sincroniza posts do Instagram e salva no cache local
 * Protegido por CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Validar autorização do cron job
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return apiError("CONFIG_ERROR", "Cron secret não configurado", 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    // Validar configuração do Instagram
    const config = validateInstagramConfig();
    if (!config.isValid) {
      return apiError(
        "CONFIG_ERROR",
        config.error ?? "Configuração inválida",
        500,
      );
    }

    // Buscar posts do Instagram com retry
    let posts: InstagramPost[] = [];
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        posts = await fetchInstagramPosts(
          config.accessToken ?? "",
          config.userId ?? "",
          postsLimit,
        );
        break;
      } catch (error) {
        retryCount++;

        if (retryCount >= maxRetries) {
          throw error;
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, retryBaseDelayMs * retryCount),
        );
      }
    }

    if (!posts || posts.length === 0) {
      return apiSuccess({
        postsCount: 0,
        warning: "Nenhum post encontrado no Instagram",
      });
    }

    if (!isRedisConfigured()) {
      return apiError(
        "CONFIG_ERROR",
        "Redis não configurado — impossível persistir cache",
        500,
      );
    }

    const cacheData: InstagramCacheData = {
      posts,
      lastUpdated: new Date().toISOString(),
      source: "api",
    };

    await setInstagramCache(cacheData);

    return apiSuccess({
      postsCount: posts.length,
      lastUpdated: cacheData.lastUpdated,
      message: "Posts sincronizados com sucesso",
    });
  } catch (error) {
    console.error("Error syncing Instagram posts:", error);
    return apiError("SYNC_ERROR", "Erro ao sincronizar posts", 500);
  }
}

/**
 * GET /api/cron/sync-instagram
 * Vercel Cron chama a rota via GET, então reaproveitamos a mesma lógica do POST.
 */
export async function GET(request: Request) {
  return POST(request);
}
