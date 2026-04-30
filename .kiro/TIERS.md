# Tier Model — SDD / Kiro

Toda tarefa deve ser classificada em um tier antes de iniciar.
O tier determina quanta cerimônia de spec é proporcional ao escopo.

## Tabela de tiers

| Tier | Quando usar | Artefatos | Fluxo Kiro |
|------|-------------|-----------|------------|
| **Trivial** | Bug ≤ 2 arquivos, ajuste cosmético, fix de texto, update de config | Nenhum | Execução direta |
| **Light** | Feature isolada, 1 fluxo de usuário, sem novo contrato de API | `requirements.md` | `spec-init` → `spec-requirements` → impl |
| **Full** | Feature multi-camada, novo contrato de API, integração externa, mudança arquitetural | `brainstorm.md` + `requirements.md` + `design.md` + `tasks.md` | Fluxo Kiro completo (ver abaixo) |

## Critérios de classificação

Responda sim/não. Cada "sim" adiciona peso para subir de tier.

- Afeta ≥ 3 arquivos distintos?
- Cria ou modifica contrato de API (route handler, serviço externo)?
- Requer decisão de schema (Prisma, Supabase)?
- Tem ≥ 2 fluxos de usuário diferentes?
- Risco de regressão em feature existente?
- Envolve autenticação, permissões ou dados sensíveis?

**0–1 sim** → Trivial | **2–3 sim** → Light | **4+ sim** → Full

## Fluxo Full (com brainstorm)

```
Phase 0 — Brainstorm (obrigatório no tier Full)
  /kiro/spec-brainstorm "tema"      → gera brainstorm.md

Phase 1 — Specification
  /kiro/spec-init "descrição"       → inicializa spec
  /kiro/spec-requirements {feature} → gera requirements.md
  /kiro/validate-gap {feature}      → (opcional) gap analysis
  /kiro/spec-design {feature}       → gera design.md
  /kiro/validate-design {feature}   → (opcional) design review
  /kiro/spec-tasks {feature}        → gera tasks.md

Phase 2 — Implementation
  /kiro/spec-impl {feature} [tasks]
  /kiro/validate-impl {feature}     → (opcional) verificação final
```

## Fluxo Light

```
/kiro/spec-init "descrição"
/kiro/spec-requirements {feature}
→ impl direto (sem design.md, sem tasks.md)
```

## Brainstorm — estrutura esperada

Arquivo `brainstorm.md` dentro do diretório da spec.
Template canônico: `.kiro/settings/templates/specs/brainstorm.md`

Seções obrigatórias:
1. **Problema** — o que precisa ser resolvido e por quê agora
2. **Alternativas** — ≥ 2 abordagens com trade-offs
3. **Decisão** — qual alternativa foi escolhida
4. **Razão** — motivação técnica/produto para a escolha

## Regras gerais

- Tier é definido manualmente antes de iniciar — não inferido automaticamente
- Specs existentes (antes deste documento) seguem o tier Full original
- Tier Light não gera `design.md` nem `tasks.md`
- SDD mentalidade sempre ativa; cerimônia proporcional ao tier
- SDD nunca justifica pular TDD, validação ou revisão de impacto
