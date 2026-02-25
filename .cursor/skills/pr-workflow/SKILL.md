---
name: pr-workflow
description: Workflow completo para criação e gestão de Pull Requests com Conventional Commits. Use quando o usuário quiser criar PR, preparar código para review, ou fazer merge de mudanças.
---

# PR Workflow - Gold Mustache

## Instruções

Siga este fluxo ao preparar e criar Pull Requests:

### Fase 1: Pré-PR Checklist

Antes de abrir o PR, valide tudo:

```bash
pnpm lint
pnpm build
```

Verifique o estado do branch:

```bash
git status
git log --oneline main..HEAD
git diff --stat main...HEAD
```

### Fase 2: Organização de Commits

#### Conventional Commits (obrigatório)

Formato: `tipo(escopo): descrição`

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Apenas documentação |
| `style` | Formatação (sem mudança de lógica) |
| `refactor` | Reestruturação sem mudar comportamento |
| `test` | Adição/correção de testes |
| `build` | Build system, dependências |
| `ci` | CI/CD pipelines |
| `chore` | Manutenção geral |
| `revert` | Reverter commit anterior |

Regras:
- Assunto com max 72 caracteres
- Tempo presente: "add" não "added"
- Sem ponto final no assunto
- Corpo explica **por quê**, não **o quê**

Exemplos:

```
feat(booking): adicionar agendamento para convidados

Permite que visitantes agendem sem criar conta, usando apenas
nome e telefone. O sistema gera um token de acesso para
consulta e cancelamento posterior.
```

```
fix(api): corrigir validação de slot duplicado

O advisory lock não estava sendo adquirido corretamente quando
dois clientes tentavam o mesmo horário simultaneamente.
Implementa lock com pg_advisory_xact_lock no barberId+date.
```

### Fase 3: Criação do PR

#### Estrutura do PR

```markdown
## Resumo
[1-3 bullet points descrevendo as mudanças]

## Motivação
[Por que essa mudança é necessária]

## Mudanças
- [Lista de mudanças técnicas relevantes]

## Screenshots (se UI)
[Capturas antes/depois para mudanças visuais]

## Checklist
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
- [ ] Testado manualmente
- [ ] Sem breaking changes (ou documentado)
- [ ] Brand Book respeitado (se visual)

## Plano de Teste
[Como verificar que as mudanças funcionam]
```

#### Comando para criar PR

```bash
git push -u origin HEAD
gh pr create --title "tipo(escopo): descrição" --body "..."
```

### Fase 4: Responder Reviews

Ao receber feedback:
1. Leia todos os comentários antes de agir
2. Agrupe correções relacionadas em um único commit
3. Responda cada comentário explicando a ação tomada
4. Re-solicite review após todas as correções

## Tipos de PR por Tamanho

| Tamanho | Arquivos | Abordagem |
|---------|----------|-----------|
| **Small** | 1-5 | PR único, review rápido |
| **Medium** | 6-15 | PR único com descrição detalhada |
| **Large** | 15+ | Considere quebrar em PRs menores |

## Branch Naming

```
feat/nome-da-feature
fix/descricao-do-bug
docs/o-que-documenta
refactor/o-que-refatora
chore/tarefa-de-manutencao
```

## Regras Importantes

- Branch base é `main` (ou `staging` se especificado)
- Rebase no branch base antes de abrir PR
- Nunca force push em branches compartilhados
- PRs para `main` precisam de review
- Inclua screenshots para qualquer mudança visual
