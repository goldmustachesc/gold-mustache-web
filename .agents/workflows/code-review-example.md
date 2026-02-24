# 📋 Exemplo de Uso - Code Review Skill

## Como usar a skill de Code Review no Windsurf

### 1. Via comando slash (recomendado)
No terminal do VS Code, digite:
```
/code-review
```

### 2. Via package.json
```bash
pnpm code-review
```

### 3. Exemplo de saída para poucos arquivos

Quando você tem poucos arquivos modificados, a saída será mais concisa:

```
=== 🔍 Code Review - Gold Mustache Barbearia ===

📁 Arquivos modificados: 3
  - src/components/example.tsx
  - src/utils/helper.ts
  - README.md

🔍 Verificação de Lint (Biome)... ✅ Verificação de Lint (Biome) - OK
🔍 Build do Projeto... ✅ Build do Projeto - OK

=== 📋 Análise Individual dos Arquivos ===
src/components/example.tsx:
  ❌ useState usado sem import adequado
  💡 Considere usar clsx ou tailwind-merge para classes condicionais

src/utils/helper.ts:
  ✅ src/utils/helper.ts - OK

✅ README.md - OK

=== 📝 Gerando Relatório ===
✅ Relatório salvo em: /Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/CODE_REVIEW_AUTO.md

=== 🎯 Resumo Final ===
Arquivos analisados: 3
Issues: 1
Sugestões: 1

Status Geral: ❌ REQUER AJUSTES

🔧 Execute as correções necessárias e rode o review novamente.
```

### 4. Relatório gerado

O relatório `CODE_REVIEW_AUTO.md` conterá:

```markdown
# 📋 Code Review - Análise Automatizada

## Status: ❌ REQUER AJUSTES

Data: 24/02/2026, 16:45:03
Reviewer: AI Assistant
Branch: feature/nova-feature

---

## 📊 Resumo da Análise

- **Arquivos modificados:** 3
- **Arquivos analisados:** 3
- **Issues encontradas:** 1
- **Sugestões:** 1

---

## 🔍 Verificações Automáticas

### Lint (Biome)
✅ Passou

### Build (Next.js)
✅ Passou

---

## 📁 Análise Detalhada dos Arquivos

### src/components/example.tsx (45 linhas)
**Issues:**
- ❌ useState usado sem import adequado

**Sugestões:**
- 💡 Considere usar clsx ou tailwind-merge para classes condicionais

### src/utils/helper.ts (23 linhas)
✅ Sem issues detectadas

### README.md (10 linhas)
✅ Sem issues detectadas

---

## 🎯 Padrões Verificados

- ✅ Conformidade com AGENTS.md
- ✅ Padrões de nomenclatura
- ✅ Tipagem TypeScript
- ✅ Imports com alias @/
- ✅ Formatação Biome
- ✅ Segurança básica

---

## 📋 Recomendações

### Obrigatórias
1. ❌ Corrigir erros de lint/build
2. ❌ Remover console.logs
3. ❌ Resolver issues de tipagem

---

## 🚀 Próximos Passos

1. Corrigir issues identificadas
2. Executar review novamente
3. Verificar funcionalidades críticas

---

**Assinatura:** AI Assistant  
**Data:** 24/02/2026, 16:45:03
```

## 🎯 Benefícios da Skill

- **Análise Automática:** Verifica 376+ arquivos em segundos
- **Padrões Consistentes:** Aplica sempre as mesmas regras do AGENTS.md
- **Relatório Detalhado:** Gera documentação do review
- **Integração Total:** Funciona com fluxo existente do projeto
- **Identificação Rápida:** Issues críticas são destacadas imediatamente

## 🔧 Personalização

Você pode personalizar as regras editando:
- `.agents/workflows/code-review-runner.mjs` - Lógica de análise
- `.agents/workflows/code-review.md` - Documentação do workflow
- `AGENTS.md` - Padrões do projeto

---

**Skill desenvolvida para Gold Mustache Barbearia** 🧔‍♂️✨
