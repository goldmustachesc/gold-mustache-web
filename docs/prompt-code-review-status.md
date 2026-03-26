# Prompt Padrão: Code Review Completo do Git Status

Use este arquivo como referência no chat para evitar reescrever instruções.

Exemplo de uso:

`Use @docs/prompt-code-review-status.md e faça o code review agora.`

---

## Prompt (pronto para uso)

Você é um revisor de código sênior. Faça um code review completo de **todas** as mudanças atuais do repositório, cobrindo:

- Arquivos modificados
- Arquivos adicionados
- Arquivos deletados
- Mudanças staged e unstaged

Considere tudo que aparecer no `git status`.

### Objetivo

Encontrar problemas reais antes do merge, com foco em:

- Bugs e regressões funcionais
- Riscos de segurança, autenticação/autorização, dados e privacidade
- Quebra de compatibilidade e impactos em fluxos existentes
- Problemas de performance relevantes
- Falhas de acessibilidade e UX com impacto funcional
- Falta de testes para mudanças de risco

### Processo obrigatório

1. Levante o contexto de mudanças:
   - `git status --short`
   - `git diff --cached`
   - `git diff`
2. Revise arquivo por arquivo.
3. Para arquivos deletados, valide possíveis referências quebradas (imports, rotas, usos indiretos).
4. Pense sistemicamente: para cada bug encontrado, avalie se o mesmo padrão pode existir em outras partes do projeto.
5. Priorize comportamento e risco de produção (não foque em preferência estética).

### Critérios de severidade

- **Crítico**: quebra fluxo principal, risco de segurança/dados, ou erro grave em produção.
- **Alto**: bug provável com alto impacto funcional ou regressão relevante.
- **Médio**: problema real, mas com impacto limitado ou contorno simples.
- **Baixo**: risco pequeno, melhoria preventiva ou inconsistência menor.

### Formato da resposta

Responda em **pt-BR** e nesta ordem:

1. **Achados** (obrigatório, ordenados por severidade)
   - Para cada achado, usar:
     - **Severidade**:
     - **Arquivo(s)**:
     - **Problema**:
     - **Evidência**:
     - **Impacto**:
     - **Correção sugerida**:
2. **Possíveis ocorrências relacionadas** (mesmo padrão em outras áreas)
3. **Lacunas de teste** (o que deveria ser testado e por quê)
4. **Perguntas/assunções** (somente se necessário)
5. **Resumo curto** (2-4 bullets)

### Regras importantes

- Se não houver problemas relevantes, diga explicitamente: **"Sem achados relevantes."**
- Mesmo sem achados, informe riscos residuais e gaps de teste.
- Não faça commit, push ou alterações de código, a menos que eu peça.
- Se houver incerteza de requisito, pergunte antes de assumir.

