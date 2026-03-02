---
name: code-review
description: Realiza code review completo dos arquivos modificados no branch atual, verificando qualidade, segurança, performance e conformidade com padrões do projeto. Use quando o usuário pedir review de código, análise de mudanças, ou antes de abrir PR.
---

# Code Review - Gold Mustache

## Instruções

Ao executar um code review, siga este fluxo rigoroso:

### Fase 1: Coleta de Contexto

1. Identifique os arquivos modificados:

```bash
git diff --name-only main...HEAD
git diff --stat main...HEAD
```

2. Leia `AGENTS.md` para relembrar os padrões do projeto.
3. Se houver mudanças visuais, consulte `docs/Brand_Book_Gold_Mustache.md`.

### Fase 2: Verificações Automáticas

Execute e reporte o resultado de cada verificação:

```bash
pnpm test        # Testes automatizados
pnpm lint        # Padrões de código (Biome)
pnpm build       # Compilação
```

### Fase 3: Análise por Arquivo

Para **cada arquivo modificado**, analise:

#### Componentes React (.tsx)
- [ ] Props tipadas com interface/type (sem `any`)
- [ ] Hooks usados corretamente (regras de hooks, deps corretas)
- [ ] `useMemo`/`useCallback` onde há re-renders custosos
- [ ] Acessibilidade: `aria-labels`, semântica HTML, keyboard nav
- [ ] Estilos via Tailwind; `clsx`/`tailwind-merge` para condicionais
- [ ] Imports usando alias `@/`
- [ ] Sem `console.log` residual
- [ ] Componente no diretório correto (`components/ui` ou `components/custom`)

#### Route Handlers / API (.ts em app/api)
- [ ] **Testes existem** em `__tests__/route.test.ts` cobrindo auth, validation, success e errors
- [ ] Validação de input com Zod
- [ ] Tratamento de erros com try/catch e respostas HTTP adequadas
- [ ] Autenticação verificada (Supabase session)
- [ ] Autorização por role quando necessário
- [ ] Sem exposição de dados sensíveis na resposta
- [ ] Prisma queries otimizadas (select/include mínimos)

#### Services & Utils (.ts)
- [ ] **Testes existem** em `__tests__/[service].test.ts` cobrindo happy path e edge cases
- [ ] Tratamento de erros robusto
- [ ] Funções com responsabilidade única
- [ ] Tipagem forte (sem `any`)
- [ ] Testabilidade (dependências injetáveis)

#### Configuração (.ts, .json)
- [ ] Sem secrets hardcoded
- [ ] Consistência com variáveis de ambiente existentes

#### Estilos (.css)
- [ ] Usa design tokens do Brand Book (`--primary`, `--background`, etc.)
- [ ] Compatível com Light/Dark mode
- [ ] Variáveis definidas em `globals.css`

### Fase 4: Análise Transversal

- [ ] **TDD Compliance**: Código novo tem testes correspondentes? Foram escritos antes da implementação? Ausência de testes para código novo é **🔴 Crítico**.
- [ ] **Cobertura de testes**: Cenários de erro, edge cases e happy path cobertos
- [ ] **Segurança**: Sem exposição de dados, inputs validados, headers mantidos
- [ ] **Performance**: Lazy loading de imagens, sem queries N+1, bundle impact
- [ ] **Breaking changes**: Interfaces/contratos alterados documentados
- [ ] **Consistência**: Naming conventions (PascalCase componentes, camelCase utils)
- [ ] **Conventional Commits**: Mensagens seguem padrão feat/fix/docs/refactor

### Fase 5: Relatório

Formate o resultado assim:

```markdown
## Code Review - [branch-name]

### Status: [APROVADO | APROVADO COM SUGESTÕES | REQUER AJUSTES]

### Verificações Automáticas
| Check | Status |
|-------|--------|
| Tests (Vitest) | PASS/FAIL |
| Lint (Biome) | PASS/FAIL |
| Build (Next.js) | PASS/FAIL |

### Arquivos Analisados

#### `path/to/file.tsx`
- 🔴 **Crítico**: [descrição - deve corrigir]
- 🟡 **Sugestão**: [descrição - considere melhorar]
- 🟢 **Elogio**: [algo bem feito]

### Resumo
- Issues críticas: N
- Sugestões: N
- Arquivos OK: N
```

## Classificação de Severidade

| Nível | Quando usar |
|-------|-------------|
| 🔴 **Crítico** | Bugs, falhas de segurança, breaking changes, erros de tipo |
| 🟡 **Sugestão** | Melhorias de performance, legibilidade, patterns melhores |
| 🟢 **Elogio** | Código bem escrito, boas decisões, patterns corretos |

## Regras Importantes

- Sempre execute `pnpm test`, `pnpm lint` e `pnpm build` antes de aprovar
- **Código novo sem testes correspondentes é 🔴 Crítico** — TDD é obrigatório no projeto
- Nunca aprove código com `any` sem justificativa documentada
- Verifique se `console.log` foi removido de código de produção
- Confirme que mudanças visuais seguem o Brand Book
- Valide que novas rotas API têm autenticação adequada
