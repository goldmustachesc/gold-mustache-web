# Performance mobile — otimizações implementadas (2026-03-21)

## Escopo

Implementação do plano “Mobile Performance 90+”: LCP, remoção de `framer-motion` do caminho crítico, elevator apenas em desktop, preload da hero.

## Mudanças principais

| Área | Ação |
|------|------|
| LCP | `fetchPriority="high"` na hero em [HeroSection.tsx](../../../src/components/sections/HeroSection.tsx); `<link rel="preload" as="image">` em [layout.tsx](../../../src/app/[locale]/layout.tsx) |
| Concorrência | Removido `priority` do logo circular na hero e do logo no [loading-elevator.tsx](../../../src/components/ui/loading-elevator.tsx) |
| Bundle | Removida dependência `framer-motion`; animações via CSS em [globals.css](../../../src/app/globals.css) |
| Header | [MobileNavOverlay.tsx](../../../src/components/layout/MobileNavOverlay.tsx) e [language-switcher.tsx](../../../src/components/ui/language-switcher.tsx) sem Framer |
| Hero | Entrada com classes `hero-anim-logo` / `hero-anim-fade-up`; contador com `IntersectionObserver` + `requestAnimationFrame` |
| Mobile | [loading-elevator-wrapper.tsx](../../../src/components/ui/loading-elevator-wrapper.tsx): elevator só quando `min-width: 769px` (sem splash em telas &lt; 769px) |

## Comando de verificação (Lighthouse mobile)

```bash
npx lighthouse "https://<staging>/pt-BR" \
  --output=json --output-path=./lighthouse-mobile.json \
  --chrome-flags="--headless --no-sandbox"
```

Interpretação: o score depende de rede, cold start do deploy e cache. Rodar **após o deploy** desta branch e comparar com [after-staging-mobile.md](./after-staging-mobile.md) (baseline ~70, LCP ~8s).

## Critérios de sucesso do plano

- `pnpm test:gate` e `pnpm build` devem passar após as mudanças.
- Meta Lighthouse mobile ≥ 90: validar no ambiente de staging/produção após deploy; se ainda abaixo, próximos alvos são variação de lab, TTI e peso de JS restante (TanStack Query, Radix, etc.).

## Complementar (Frente E)

- `viewport` com `maximumScale: 1` já está em [layout.tsx](../../../src/app/[locale]/layout.tsx) (`export const viewport`).
- Fontes: três famílias via `next/font`; ajustes finos podem ser feitos depois se o LCP de texto ainda pesar.
