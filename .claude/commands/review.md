---
description: Code review do branch atual
---

Analise as mudanças do branch atual:

1. Execute `git diff --name-only main...HEAD` para listar arquivos
2. Execute `pnpm test`, `pnpm lint`, `pnpm build`
3. Para cada arquivo, verifique conformidade com `CLAUDE.md`
4. Liste findings por severidade (Crítico, Alto, Médio, Baixo)
5. Resuma riscos e lacunas de teste

Responda em português.
