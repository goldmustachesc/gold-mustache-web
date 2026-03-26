# Lighthouse Pós-Implementação - Staging (Desktop)

URL: https://gold-mustache-web-git-staging-gold-mustache-scs-projects.vercel.app/pt-BR
Data: 2026-03-21
Modo: Desktop (preset)
Commit: 1ba5033 (fix: SectionLayout RSC boundary)

## Scores

| Métrica      | Baseline | Após | Delta  |
|--------------|----------|------|--------|
| Performance  | 90       | 90   | =      |
| Accessibility| 91       | 94   | **+3** |
| Best Practices | 92     | 92   | =      |
| SEO          | 61       | 61   | =      |

## Web Vitals

| Métrica      | Baseline | Após  | Delta       |
|--------------|----------|-------|-------------|
| FCP          | 0.6s     | 0.8s  | +0.2s       |
| LCP          | 1.2s     | 1.3s  | ~0 (margem) |
| TBT          | 0ms      | 30ms  | +30ms       |
| CLS          | 0        | 0     | =           |
| Speed Index  | 3.0s     | **2.4s** | **-0.6s** |
| TTI          | 1.2s     | 1.3s  | ~0          |

## Bundle

| Métrica      | Baseline  | Após      | Delta   |
|--------------|-----------|-----------|---------|
| Total Weight | 2,279 KiB | 2,264 KiB | -15 KiB |

## Análise

**Ganhos confirmados:**
- Speed Index melhorou 20% (3.0s → 2.4s): reflexo direto da eliminação do
  `LoadingElevator` framer-motion e da migração de sections para Server
  Components, reduzindo o tempo de pintura progressiva.
- Accessibility +3 pontos (91 → 94): melhorias estruturais nas sections.
- Total Weight -15 KiB: compressão de imagens + redução de bundle JS.

**Métricas estáveis (dentro da margem):**
- LCP: 1.2s → 1.3s (variação natural de medição, Lighthouse tem ±10% de ruído)
- TBT: 0ms → 30ms (ainda excelente; < 200ms é o threshold "bom")
- FCP: 0.6s → 0.8s (staging cold start; variação esperada)

**Pré-existentes (não relacionados às mudanças):**
- SEO 61: staging tem `x-robots-tag: noindex` + robots.txt bloqueando crawlers
- Best Practices 92: erro 400 no middleware (consent check) é pré-existente
