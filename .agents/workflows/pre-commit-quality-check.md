---
description: Análise completa de qualidade de código antes de commits
---

# 🔍 Pre-Commit Quality Check - Gold Mustache

Este workflow realiza uma análise completa de qualidade de código antes de fazer commit, garantindo que apenas código de alta qualidade seja enviado para o repositório.

## Como usar

Execute com o comando: `/pre-commit` ou `pnpm pre-commit-check`

## O que este workflow faz

### 1. Análise de Mudanças
- Identifica todos os arquivos modificados (staged e unstaged)
- Compara com o último commit
- Gera lista completa de arquivos para análise

### 2. Verificações de Qualidade Obrigatórias
- **Lint (Biome):** Verificação completa de estilo e padrões
- **TypeScript:** Compilação e verificação de tipos
- **Build Next.js:** Teste de build completo
- **Testes Unitários:** Execução de todos os testes
- **Coverage:** Verificação de cobertura mínima

### 3. Análise de Segurança
- Scan de vulnerabilidades de dependências
- Verificação de secrets/sensitive data
- Análise de imports suspeitos
- Validação de CSP e headers de segurança

### 4. Performance e Otimização
- Análise de bundle size
- Verificação de lazy loading
- Otimização de imagens
- Performance de componentes React

### 5. Padrões do Projeto (Gold Mustache)
- Conformidade com `AGENTS.md`
- Brand Book compliance para mudanças visuais
- Padrões de nomenclatura
- Estrutura de arquivos correta
- Uso adequado de design tokens

### 6. Qualidade de Código
- Complexidade ciclomática
- Duplicação de código
- Code smell detection
- Boas práticas React/Next.js
- Uso correto de hooks TypeScript

### 7. Internacionalização
- Verificação de tradução missing
- Consistência entre idiomas
- Formatos de data/moeda
- RTL support verification

### 8. Testes e Cobertura
- Testes unitários executando
- Testes de integração
- Coverage mínimo por módulo
- Testes E2E críticos

### 9. Documentação
- README atualizado se necessário
- JSDoc em funções críticas
- Changelog atualizado
- Documentação de APIs

## Critérios de Bloqueio (❌ FAIL)

O commit será bloqueado se:

### Críticos
- ❌ Erros de TypeScript
- ❌ Falha no build
- ❌ Testes falhando
- ❌ Vulnerabilidades de segurança críticas
- ❌ Breaking changes não documentados

### Qualidade
- ❌ Code smells severos
- ❌ Complexidade excessiva
- ❌ Duplicação de código > 20%
- ❌ Violação de padrões do AGENTS.md

### Performance
- ❌ Regressão de performance > 10%
- ❌ Bundle size aumentando > 5%
- ❌ Componentes sem otimização necessária

## Critérios de Aviso (⚠️ WARN)

O commit será permitido com avisos se:

- Sugestões de melhoria de código
- Cobertura de testes abaixo do ideal
- Pequenas otimizações possíveis
- Documentação pode ser melhorada

## Relatório Gerado

O workflow gera um relatório detalhado em `PRE_COMMIT_QUALITY_REPORT.md` com:

- Status geral: ✅ PASS / ❌ FAIL / ⚠️ WARN
- Score de qualidade (0-100)
- Detalhes por categoria
- Issues críticas e sugestões
- Métricas de performance
- Recomendações específicas
- Próximos passos

## Comandos Utilizados

```bash
# Análise completa
pnpm pre-commit-check

# Verificações individuais
pnpm lint
pnpm type-check
pnpm build
pnpm test
pnpm test:coverage

# Análise de segurança
pnpm audit
npx @next/bundle-analyzer

# Performance
npx lighthouse http://localhost:3001
```

## Configuração

### Thresholds Configuráveis
- **Coverage mínimo:** 80%
- **Complexidade máxima:** 10
- **Duplicação máxima:** 15%
- **Bundle size max:** +5%
- **Performance score min:** 90

### Exclusões
- Arquivos de terceiros em `vendor/`
- Arquivos gerados automaticamente
- Configurações de build
- Arquivos de migração

## Integração com Git Hooks

O workflow pode ser integrado com Husky:

```bash
# Adicionar como pre-commit hook
npx husky add .husky/pre-commit "pnpm pre-commit-check"

# Adicionar como pre-push hook
npx husky add .husky/pre-push "pnpm pre-commit-check --strict"
```

## Modos de Execução

### Normal (default)
- Análise completa
- Permite commit com avisos
- Gera relatório detalhado

### Strict (`--strict`)
- Bloqueia qualquer aviso
- Exige 100% nos critérios
- Modo recomendado para main branch

### Quick (`--quick`)
- Análise essencial apenas
- Ignora algumas otimizações
- Para desenvolvimento rápido

## Exemplo de Uso

```bash
# Análise completa antes de commit
pnpm pre-commit-check

# Modo strict para produção
pnpm pre-commit-check --strict

# Quick check durante desenvolvimento
pnpm pre-commit-check --quick

# Análise de arquivos específicos
pnpm pre-commit-check --files src/components/**/*.tsx
```

## Métricas e KPIs

O workflow monitora:

- **Quality Score:** 0-100 baseado em todos os critérios
- **Technical Debt:** Estimado em horas
- **Test Coverage:** Porcentagem por módulo
- **Performance Score:** Lighthouse metrics
- **Security Score:** Vulnerability scan
- **Maintainability Index:** Facilidade de manutenção

## Notificação de Resultados

- ✅ **PASS:** Commit permitido, código pronto
- ⚠️ **WARN:** Commit permitido com recomendações
- ❌ **FAIL:** Commit bloqueado, correções necessárias

---

**Este workflow garante qualidade consistente em todo o código do Gold Mustache Barbearia.**
