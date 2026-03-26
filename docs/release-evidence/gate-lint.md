# Gate: pnpm lint

**Data:** 2026-03-19
**Branch:** staging
**Commit:** 5791c8c
**Resultado:** PASS (exit 0)

## Output

```
> biome check

src/components/ui/__tests__/blog-card.test.tsx:15:5 lint/performance/noImgElement
  ! Don't use <img> element. (mock de teste — aceitável)

src/components/ui/__tests__/optimized-image.test.tsx:19:5 lint/performance/noImgElement
  ! Don't use <img> element. (mock de teste — aceitável)

Checked 830 files in 222ms. No fixes applied.
Found 2 warnings.
```

## Análise

- Exit code: 0 (sucesso)
- Erros: 0
- Warnings: 2 — ambos em mocks de testes (`vi.mock("next/image")`), onde `<img>` é intencional para simular o componente `next/image`. Não representam problema de produção.

## Status: ✅ APROVADO
