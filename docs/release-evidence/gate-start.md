# Gate: pnpm start (modo produção local)

**Data:** 2026-03-20
**Branch:** staging
**Commit:** bcfb711
**Comando:** `PORT=3002 pnpm start`
**Resultado:** ✅ APROVADO

## Resultado do build anterior

`pnpm build` executado imediatamente antes: exit 0, todas as rotas geradas (estático + dinâmico).

## Servidor iniciado

```
▲ Next.js 16.1.6
- Local: http://localhost:3002
✓ Ready in 446ms
```

## Rotas testadas via curl

| Rota | HTTP | Resultado |
|------|------|-----------|
| `GET /pt-BR` | 200 | ✅ |
| `GET /pt-BR/login` | 200 | ✅ |
| `GET /pt-BR/agendar` | 200 | ✅ |
| `GET /api/services` | 200 | ✅ |
| `GET /api/barbers` | 200 | ✅ |
| `GET /robots.txt` | 200 | ✅ `Disallow: /` (modo local sem NEXT_PUBLIC_ENVIRONMENT=production) |
| `GET /sitemap.xml` | 200 | ✅ urlset vazio (modo local sem isProduction) |

## Observações

- `robots.txt` local exibe `Disallow: /` pois `NEXT_PUBLIC_ENVIRONMENT` não está setada como `production` localmente — comportamento esperado e correto em staging/dev.
- Em produção na Vercel, `NEXT_PUBLIC_ENVIRONMENT=production` está configurada, o que vai habilitar indexação.
- `sitemap.xml` vazio localmente — correto, pois `siteConfig.isProduction` é `false` sem a variável de ambiente de produção.

## Status: ✅ APROVADO
