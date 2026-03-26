---
description: Prepara branch para abertura de PR
---

1. Verifique o estado do branch: `git status`, commits não enviados e escopo das mudanças.
2. Execute `pnpm test:gate` (ou `pnpm test`, `pnpm lint`, `pnpm build` se o gate não for solicitado).
3. Resuma as mudanças em formato pronto para PR: motivação, o que mudou, impacto.
4. Identifique riscos, gaps de validação, necessidade de screenshots (UI) e testes de regressão.
5. Sugira próximo passo (ajustes, push, abertura de PR) sem fazer push nem criar PR a menos que o usuário peça explicitamente.

Responda em português do Brasil.
