# Lighthouse Pós-Implementação - Staging (Mobile)

URL: https://gold-mustache-web-git-staging-gold-mustache-scs-projects.vercel.app/pt-BR
Data: 2026-03-21
Modo: Mobile (padrão Lighthouse)
Commit: 1ba5033 (fix: SectionLayout RSC boundary)

> Nota: baseline mobile não foi capturado na sessão anterior (run iniciado mas
> não concluído antes do timeout). Esta é a primeira medição mobile disponível.

## Scores

| Métrica        | Resultado |
|----------------|-----------|
| Performance    | 70        |
| Accessibility  | 94        |
| Best Practices | 96        |
| SEO            | 61        |

## Web Vitals

| Métrica     | Resultado |
|-------------|-----------|
| FCP         | 1.2s      |
| LCP         | 8.0s      |
| TBT         | 90ms      |
| CLS         | 0         |
| Speed Index | 5.7s      |
| TTI         | 11.1s     |
| Total Weight| 2,066 KiB |

## Oportunidades identificadas (mobile)

| Auditoria                      | Economia Estimada |
|--------------------------------|-------------------|
| unused-javascript              | 89 KiB            |
| image-delivery-insight         | 56 KiB            |
| cache-insight                  | 27 KiB            |
| legacy-javascript-insight      | 14 KiB            |
| font-display-insight           | 20ms              |
| lcp-discovery-insight          | — (LCP não preloaded) |
| mainthread-work-breakdown      | 2.6s main thread  |

## Análise

**Performance mobile 70 com LCP 8.0s** — reflete a natureza do dispositivo
simulado (CPU 4x slowdown, rede 4G). O LCP é bloqueado pelo hero image
(interno-01.webp, ~100vw) que não está sendo descoberto cedo pelo preloader
do browser (`lcp-discovery-insight: 0`).

**Possíveis causas do LCP alto:**
1. A imagem hero é servida via `fill` em um `motion.div` (background) — o
   preloader não detecta imagens em posição absoluta/background
2. TTI de 11.1s indica main thread ocupado com hidratação/JS

**Ações recomendadas para próxima iteração:**
- Adicionar `fetchPriority="high"` explícito no hero image
- Considerar `<link rel="preload" as="image">` para a hero image no layout
- Investigar `unused-javascript` 89 KiB: provavelmente framer-motion residual
  nos Client Components que ainda usam a lib (HeroSection)
- Verificar `meta-viewport` (pode ser viewport lock que afeta scoring)

**Métricas positivas:**
- CLS: 0 (layout estável)
- TBT: 90ms (abaixo do threshold de 300ms "bom" para mobile)
- Accessibility: 94 (excelente)
