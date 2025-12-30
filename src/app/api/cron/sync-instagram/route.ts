import {
  fetchInstagramPosts,
  validateInstagramConfig,
} from "@/services/instagram";
import type { InstagramCacheData, InstagramPost } from "@/types/instagram";
import { NextResponse } from "next/server";
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
      console.error("[Instagram Cron] CRON_SECRET não configurado");
      return NextResponse.json(
        { error: "Cron secret não configurado" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Instagram Cron] Tentativa de acesso não autorizado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Validar configuração do Instagram
    const config = validateInstagramConfig();
    if (!config.isValid) {
      console.error("[Instagram Cron] Configuração inválida:", config.error);
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    console.log("[Instagram Cron] Iniciando sincronização...");

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
        console.warn(
          `[Instagram Cron] Tentativa ${retryCount}/${MAX_RETRIES} falhou:`,
          error,
        );

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
      console.warn("[Instagram Cron] Nenhum post retornado da API");
      return NextResponse.json(
        {
          error: "Nenhum post encontrado",
          postsCount: 0,
        },
        { status: 500 },
      );
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

    console.log(
      `[Instagram Cron] ✅ Sincronização concluída: ${posts.length} posts salvos`,
    );

    return NextResponse.json({
      success: true,
      postsCount: posts.length,
      lastUpdated: cacheData.lastUpdated,
      message: "Posts sincronizados com sucesso",
    });
  } catch (error) {
    console.error("[Instagram Cron] ❌ Erro na sincronização:", error);

    return NextResponse.json(
      {
        error: "Erro ao sincronizar posts",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/sync-instagram
 * Endpoint para teste manual (apenas em desenvolvimento)
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Método não permitido em produção" },
      { status: 405 },
    );
  }

  // Em desenvolvimento, redireciona para POST
  return NextResponse.json({
    message:
      "Use POST com Authorization: Bearer {CRON_SECRET} para sincronizar",
    dev: "Em dev, você pode testar: curl -X POST http://localhost:3001/api/cron/sync-instagram -H 'Authorization: Bearer {seu_cron_secret}'",
  });
}
