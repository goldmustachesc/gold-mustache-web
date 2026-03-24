---
description: Executa code review completo do branch atual
---

Analise as mudanças do branch atual em relação a `main` (ou ao base branch informado pelo usuário):

1. Execute `git diff --name-only main...HEAD` (ou o intervalo correto) para listar arquivos alterados.
2. Execute `pnpm test`, `pnpm lint` e `pnpm build` e reporte o resultado.
3. Para cada arquivo modificado relevante, verifique conformidade com `AGENTS.md` e com `.cursor/rules/` aplicáveis.
4. Liste findings ordenados por severidade (Crítico, Alto, Médio, Baixo) com evidência concreta.
5. Resuma riscos residuais e lacunas de teste.

Responda em português do Brasil.
