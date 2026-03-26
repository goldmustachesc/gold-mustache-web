# Design: Stack Code Reviewer

## Objetivo

Criar um subagent de code review especializado em `Next.js`, `Prisma` e `Supabase`, com foco principal em bugs, regressões comportamentais, testes faltantes e riscos de segurança.

## Escopo

- Nível: projeto
- Localização: `.cursor/agents/stack-code-reviewer.md`
- Modo de execução: somente leitura com `readonly: true`
- Sem impacto em runtime, build, banco de dados ou deploy

## Abordagem aprovada

Foi aprovada a abordagem de reviewer especialista de stack. Em vez de um reviewer genérico, o subagent deve priorizar heurísticas específicas da stack usada no projeto:

- `Next.js`: boundaries entre server/client, route handlers, server actions, cache, revalidation, hidratação, autenticação e exposição indevida de segredos
- `Prisma`: correção de queries, suposições de nulabilidade, transações, concorrência, mudanças inseguras de schema e cobertura de testes
- `Supabase`: auth, autorização, uso indevido de clientes privilegiados, variáveis sensíveis e suposições de RLS

## Gatilhos de uso

O subagent deve ser usado proativamente quando houver mudanças em arquivos ou fluxos relacionados a:

- rotas e componentes em `Next.js`
- schema, migrations ou queries do `Prisma`
- autenticação, sessão e acesso a dados com `Supabase`
- preparação de review antes de abrir PR ou após uma implementação relevante

## Formato de saída

O review deve seguir esta ordem:

1. Findings por severidade
2. Perguntas abertas ou premissas
3. Riscos residuais e lacunas de teste
4. Resumo curto das mudanças

Cada finding deve ser baseado em evidência concreta no diff ou no código relacionado, evitando sugestões especulativas.

## Riscos e mitigação

- Risco: delegação ruim por `description` genérica
  - Mitigação: descrição específica com stack, gatilhos e foco do review
- Risco: o reviewer editar arquivos quando o objetivo é apenas produzir findings
  - Mitigação: frontmatter com `readonly: true` para manter o agente restrito a análise
- Risco: review prolixo e pouco acionável
  - Mitigação: exigir findings por severidade e correções mínimas recomendadas
- Risco: falso positivo por excesso de opinião arquitetural
  - Mitigação: instruir o subagent a evitar refatorações amplas sem evidência concreta
