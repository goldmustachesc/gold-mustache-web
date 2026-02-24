---
description: Realiza code review completo dos arquivos modificados no branch atual
---

# Code Review Completo - Gold Mustache

Este workflow realiza uma análise completa dos arquivos modificados, seguindo os padrões do projeto Gold Mustache Barbearia.

## Como usar

Execute com o comando: `/code-review`

## O que este workflow faz

### 1. Análise de Mudanças
// turbo
- Identifica arquivos modificados no branch atual
- Compara com branch main/base
- Gera lista de arquivos para análise

### 2. Verificação de Qualidade Automática
// turbo
- Executa `pnpm lint` para verificar padrões de código
- Executa `pnpm build` para validar compilação
- Verifica erros de TypeScript
- Valida formatação com Biome

### 3. Análise de Código por Arquivo
Para cada arquivo modificado:
- Verifica conformidade com `AGENTS.md`
- Valida naming conventions (PascalCase, camelCase, etc.)
- Checa uso correto de imports (`@/` alias)
- Verifica tipagem TypeScript adequada
- Analiza uso de Tailwind vs styles customizados
- Valida conformidade com Brand Book (se aplicável)

### 4. Análise Específica por Tipo

#### Componentes React (.tsx)
- Props tipadas corretamente
- Uso de hooks adequado
- Performance (useMemo, useCallback onde necessário)
- Acessibilidade (aria-labels, semântica HTML)
- Estrutura de pastas correta

#### Services & Utils (.ts)
- Tratamento de erros adequado
- Validação de inputs
- Documentação JSDoc
- Testabilidade do código

#### Configuração (.ts, .json)
- Sintaxe válida
- Segurança de dados sensíveis
- Consistência com ambiente

#### Estilos (.css)
- Uso de design tokens do Brand Book
- Variáveis CSS definidas em `globals.css`
- Compatibilidade Light/Dark mode

### 5. Verificação de Documentação
- Updates em `IMPROVEMENTS.md` se necessário
- Documentação de novas features
- Atualização de READMEs relevantes

### 6. Análise de Segurança
- Sem exposure de dados sensíveis
- Validação de inputs do usuário
- Headers de segurança mantidos
- CSP configurado corretamente

### 7. Performance & SEO
- Lazy loading de imagens
- Otimização de bundle
- Meta tags adequadas
- Estrutura semântica HTML

## Critérios de Avaliação

### ✅ Aprovado
- Passa em todas as verificações automáticas
- Segue todos os padrões do projeto
- Sem breaking changes não documentados
- Performance mantida ou melhorada

### ⚠️ Aprovado com Sugestões
- Funciona mas tem melhorias possíveis
- Pequenos desvios dos padrões
- Documentação pode ser melhorada

### ❌ Requer Ajustes
- Erros de lint/TypeScript
- Não segue padrões do projeto
- Quebra funcionalidades existentes
- Problemas de segurança

## Relatório Gerado

O workflow gera um relatório completo seguindo o formato de `CODE_REVIEW.md` com:

- Status geral da revisão
- Lista de arquivos analisados
- Detalhes das mudanças por arquivo
- Testes realizados
- Impacto na performance
- Verificação de segurança
- Recomendações
- Conclusão e próximos passos

## Comandos Utilizados

```bash
# Identificar arquivos modificados
git diff --name-only main...HEAD

# Verificações de qualidade
pnpm lint
pnpm build
pnpm type-check

# Análise específica
npx tsc --noEmit
npx biome check --verbose
```

## Notas do Reviewer

- Sempre consultar `docs/Brand_Book_Gold_Mustache.md` para mudanças visuais
- Verificar conformidade com Conventional Commits
- Garantir compatibilidade com Next.js 15.5.2 e React 19.1.0
- Validar que não há regressões em funcionalidades críticas (booking, Instagram feed)
