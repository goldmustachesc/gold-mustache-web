import {
  fetchInstagramPosts,
  validateInstagramConfig,
} from "@/services/instagram";
import type { InstagramCacheData, InstagramPost } from "@/types/instagram";
import { apiSuccess, apiError } from "@/lib/api/response";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Constantes de configuração do cron
const MAX_RETRIES = 3;
const POSTS_LIMIT = 10;
const RETRY_BASE_DELAY_MS = 1000;

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

    while (retryCount < MAX_RETRIES) {
      try {
        posts = await fetchInstagramPosts(
          config.accessToken ?? "",
          config.userId ?? "",
          POSTS_LIMIT,
        );
        break;
      } catch (error) {
        retryCount++;

        if (retryCount >= MAX_RETRIES) {
          throw error;
        }

        // Aguardar antes de tentar novamente (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_DELAY_MS * retryCount),
        );
      }
    }

    if (!posts || posts.length === 0) {
      return apiSuccess({
        postsCount: 0,
        warning: "Nenhum post encontrado no Instagram",
      });
    }

    // Preparar dados do cache
    const cacheData: InstagramCacheData = {
      posts,
      lastUpdated: new Date().toISOString(),
      source: "api",
    };

    // Criar diretório se não existir
    const cacheDir = path.join(process.cwd(), "public", "data");
    await mkdir(cacheDir, { recursive: true });

    // Salvar no cache
    const cacheFilePath = path.join(cacheDir, "instagram-cache.json");
    await writeFile(cacheFilePath, JSON.stringify(cacheData, null, 2), "utf-8");

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
 * Endpoint para teste manual (apenas em desenvolvimento)
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return apiError(
      "METHOD_NOT_ALLOWED",
      "Método não permitido em produção",
      405,
    );
  }

  // Em desenvolvimento, redireciona para POST
  return apiSuccess({
    message:
      "Use POST com Authorization: Bearer {CRON_SECRET} para sincronizar",
    dev: "Em dev, você pode testar: curl -X POST http://localhost:3001/api/cron/sync-instagram -H 'Authorization: Bearer {seu_cron_secret}'",
  });
}
