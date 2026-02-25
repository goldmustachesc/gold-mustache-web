# 🤖 Skills Windsurf - Gold Mustache Barbearia

Este diretório contém as skills/workflows de IA para automatizar tarefas de desenvolvimento no projeto Gold Mustache.

## 📋 Skills Disponíveis

### 🔍 Code Review Completo

**Arquivo:** `code-review.md`
**Runner:** `code-review-runner.mjs`
**Comando:** `/code-review` ou `pnpm code-review`

Realiza análise completa dos arquivos modificados seguindo os padrões do projeto:

#### ✅ Verificações Automáticas
- **Lint (Biome):** Valida formatação e padrões de código
- **Build (Next.js):** Verifica se o projeto compila sem erros
- **TypeScript:** Detecta problemas de tipagem
- **Git Diff:** Identifica arquivos modificados no branch atual

#### 📁 Análise por Arquivo
- **Componentes React (.tsx):** Props tipadas, hooks, performance, acessibilidade
- **Services/Utils (.ts):** Tratamento de erros, validação, documentação
- **Configuração:** Sintaxe, segurança, consistência
- **Estilos (.css):** Design tokens, Brand Book conformidade

#### 🎯 Padrões Verificados
- Conformidade com `AGENTS.md`
- Naming conventions (PascalCase, camelCase)
- Imports com alias `@/`
- Tipagem TypeScript adequada
- Uso de Tailwind vs styles customizados
- Brand Book compliance para mudanças visuais

#### 📊 Relatório Gerado
O workflow gera um relatório completo em `CODE_REVIEW_AUTO.md` com:
- Status geral (APROVADO/REQUER AJUSTES)
- Lista de arquivos analisados
- Issues e sugestões por arquivo
- Resultados das verificações automáticas
- Recomendações e próximos passos

### 🚀 Pre-Commit Quality Check

**Arquivo:** `pre-commit-quality-check.md`
**Runner:** `pre-commit-quality-check.mjs`
**Comando:** `/pre-commit` ou `pnpm pre-commit-check`

Análise completa de qualidade de código antes de commits, garantindo apenas código de alta qualidade no repositório.

#### 🔍 Análises Completas
- **📦 Dependências:** Vulnerabilidades, pacotes desatualizados
- **📊 Qualidade:** Complexidade, duplicação, code smells
- **🧪 Testes:** Execução, coverage mínimo (80%)
- **⚡ Performance:** Bundle size, build analysis
- **🔒 Segurança:** Secrets detection, vulnerability scan

#### 📊 Score de Qualidade
Calcula score geral (0-100) baseado em:
- Dependências (15%)
- Qualidade de código (25%)
- Testes (25%)
- Performance (20%)
- Segurança (15%)

#### 🎯 Modos de Execução
- **Normal:** Análise completa, permite avisos
- **Strict:** Exige 90+ score, bloqueia qualquer aviso
- **Quick:** Análise essencial, para desenvolvimento rápido

#### 📋 Status de Commit
- **✅ PASS (70+):** Código aprovado para commit
- **⚠️ WARN (70-85):** Permitido com recomendações
- **❌ FAIL (<70):** Bloqueado, correções necessárias

#### 📊 Relatório Detalhado
Gera `PRE_COMMIT_QUALITY_REPORT.md` com:
- Score geral e por categoria
- Issues críticas e sugestões
- Métricas de performance e coverage
- Recomendações específicas
- Próximos passos

## 🚀 Como Usar

### Via Windsurf (Recomendado)
1. Abra o terminal no VS Code
2. Digite `/code-review` ou `/pre-commit` e pressione Enter
3. Aguarde a análise completa

### Via Terminal
```bash
# Code review dos arquivos modificados
pnpm code-review

# Análise completa antes de commit
pnpm pre-commit-check

# Modo strict (exige 100%)
pnpm pre-commit-check --strict

# Modo quick (desenvolvimento rápido)
pnpm pre-commit-check --quick
```

### Integração com Git Hooks
```bash
# Adicionar pre-commit hook automático
npx husky add .husky/pre-commit "pnpm pre-commit-check"

# Adicionar pre-push hook mais rigoroso
npx husky add .husky/pre-push "pnpm pre-commit-check --strict"
```

## 📋 Estrutura dos Workflows

Cada workflow segue o padrão:

```
.agents/workflows/
├── README.md                      # Este arquivo
├── code-review.md                 # Documentação do code review
├── code-review-runner.mjs          # Script executável de code review
├── code-review-example.md          # Exemplos de uso do code review
├── pre-commit-quality-check.md     # Documentação do pre-commit
├── pre-commit-quality-check.mjs    # Script executável do pre-commit
├── pre-commit-example.md           # Exemplos de uso do pre-commit
└── [future-workflows]/            # Novos workflows aqui
```

### Template para Novos Workflows

1. **Documentação (.md):** Descrição completa do que faz
2. **Runner (.mjs):** Script executável com:
   - Cores para output amigável
   - Tratamento de erros
   - Relatórios detalhados
   - Integração com comandos do projeto

## 🔧 Configuração

### Adicionar ao package.json
```json
{
  "scripts": {
    "code-review": "node .agents/workflows/code-review-runner.mjs",
    "pre-commit-check": "node .agents/workflows/pre-commit-quality-check.mjs"
  }
}
```

### Padrões de Código
- Usar ES modules (`import`/`export`)
- Seguir regras do Biome
- Tratamento adequado de erros
- Output colorido e informativo
- Gerar relatórios em markdown

## 🎯 Benefícios

### Para Code Review
- **Automação:** Reduz tempo manual de review
- **Consistência:** Aplica os mesmos padrões sempre
- **Documentação:** Gera histórico das revisões
- **Integração:** Funciona com fluxo atual do projeto
- **Qualidade:** Garante conformidade com padrões

### Para Pre-Commit
- **Qualidade Garantida:** Apenas código de alta qualidade no repo
- **Catch Early:** Detecta problemas antes do commit
- **Métricas:** Score quantitativo de qualidade
- **Segurança:** Prevenção de vulnerabilidades
- **Performance:** Evita regressões de performance

## 📈 Métricas e KPIs

### Code Review
- Arquivos analisados por execução
- Issues detectadas vs corrigidas
- Tempo de análise por arquivo
- Taxa de falsos positivos

### Pre-Commit
- Score médio de qualidade
- Taxa de sucesso de commits
- Tempo de análise por commit
- Principais categorias de falhas

## 🔮 Próximas Melhorias

- [ ] Integração com GitHub Actions
- [ ] Verificação automática de dependências
- [ ] Análise de segurança avançada
- [ ] Métricas de cobertura de teste
- [ ] Integração com Pull Requests
- [ ] Dashboard de métricas de qualidade
- [ ] Auto-correção de issues simples

---

**Desenvolvido para Gold Mustache Barbearia**
Seguindo os padrões definidos em `AGENTS.md` 🧔‍♂️✨
