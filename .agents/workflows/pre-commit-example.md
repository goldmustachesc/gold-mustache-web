# 🚀 Exemplo de Uso - Pre-Commit Quality Check

## Como usar a skill de Pre-Commit Quality Check no Windsurf

### 1. Via comando slash (recomendado)
No terminal do VS Code, digite:
```
/pre-commit
```

### 2. Via package.json
```bash
# Análise completa
pnpm pre-commit-check

# Modo strict (exige 100%)
pnpm pre-commit-check --strict

# Modo quick (análise essencial)
pnpm pre-commit-check --quick
```

### 3. Exemplo de saída completa

```
=== 🔍 Pre-Commit Quality Check - Gold Mustache Barbearia ===
Modo: Normal

=== 📦 Análise de Dependências ===
🔍 Verificação de vulnerabilidades...
✅ Verificação de vulnerabilidades - OK

=== 📊 Análise de Qualidade de Código ===
🔍 Analisando arquivos modificados...
✅ Análise de qualidade - OK

=== 🧪 Verificação de Testes ===
🔍 Execução de testes...
✅ Execução de testes - OK
🔍 Verificação de coverage...
✅ Verificação de coverage - OK

=== ⚡ Análise de Performance ===
🔍 Build para análise de performance...
✅ Build para análise de performance - OK

=== 🔒 Análise de Segurança ===
🔍 Verificação de segurança...
✅ Verificação de segurança - OK

=== 📝 Gerando Relatório ===
✅ Relatório salvo em: /Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/PRE_COMMIT_QUALITY_REPORT.md

=== 🎯 Resultado Final ===
Score Geral: 92/100
Duração: 45.2s
Status: ✅ PASS

✅ Código aprovado para commit!
```

### 4. Relatório Gerado

O relatório `PRE_COMMIT_QUALITY_REPORT.md` conterá:

```markdown
# 🔍 Pre-Commit Quality Report

## Status: ✅ PASS

**Data:** 24/02/2026, 16:55:00  
**Score Geral:** 92/100  
**Modo:** Normal

---

## 📊 Resumo por Categoria

| Categoria | Score | Status |
|-----------|-------|--------|
| 📦 Dependências | 100/100 | ✅ |
| 📊 Qualidade | 85/100 | ✅ |
| 🧪 Testes | 90/100 | ✅ |
| ⚡ Performance | 95/100 | ✅ |
| 🔒 Segurança | 100/100 | ✅ |

---

## 📦 Dependências

✅ Nenhuma issue de dependências encontrada

---

## 📊 Qualidade de Código

### Sugestões de Melhoria:
- 💡 src/components/example.tsx: Considere dividir em componentes menores

---

## 🧪 Testes

**Coverage:** 85%  
**Mínimo Requerido:** 80%

✅ Todos os testes passando

---

## ⚡ Performance

**Bundle Size:** 2.3MB

✅ Performance dentro dos limites aceitáveis

---

## 🔒 Segurança

✅ Nenhuma vulnerabilidade de segurança encontrada

---

## 🎯 Recomendações

👍 Bom trabalho! Considere as sugestões de melhoria.

---

## 🚀 Próximos Passos

1. Código pronto para commit ✅
2. Continue com o workflow normal
3. Mantenha a qualidade!

---

**Relatório gerado automaticamente pelo Pre-Commit Quality Check**  
**Gold Mustache Barbearia - 24/02/2026, 16:55:00**
```

### 5. Exemplo com Falhas

```
=== 🔍 Pre-Commit Quality Check - Gold Mustache Barbearia ===
Modo: Normal

=== 📦 Análise de Dependências ===
🔍 Verificação de vulnerabilidades...
❌ Verificação de vulnerabilidades - FALHOU

=== 📊 Análise de Qualidade de Código ===
🔍 Analisando arquivos modificados...
✅ Análise de qualidade - OK

=== 🧪 Verificação de Testes ===
🔍 Execução de testes...
❌ Execução de testes - FALHOU

=== ⚡ Análise de Performance ===
🔍 Build para análise de performance...
✅ Build para análise de performance - OK

=== 🔒 Análise de Segurança ===
🔍 Verificação de segurança...
✅ Verificação de segurança - OK

=== 📝 Gerando Relatório ===
✅ Relatório salvo em: /Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/PRE_COMMIT_QUALITY_REPORT.md

=== 🎯 Resultado Final ===
Score Geral: 45/100
Duração: 32.1s
Status: ❌ FAIL

🔧 Corrija as issues identificadas antes de commitar.
```

### 6. Modos de Execução

#### Normal (default)
- Análise completa
- Permite commit com avisos (score > 70)
- Gera relatório detalhado

#### Strict (`--strict`)
- Bloqueia qualquer aviso (score > 90)
- Exige 100% nos critérios críticos
- Modo recomendado para main branch

#### Quick (`--quick`)
- Análise essencial apenas
- Ignora algumas otimizações
- Para desenvolvimento rápido
- Pula verificação de coverage e performance

### 7. Integração com Git Hooks

Adicione como pre-commit hook:

```bash
# Adicionar hook
npx husky add .husky/pre-commit "pnpm pre-commit-check"

# Tornar executável
chmod +x .husky/pre-commit
```

Agora toda vez que você fizer commit, a análise será executada automaticamente!

### 8. Thresholds Configuráveis

Você pode ajustar os limites no script:

```javascript
const CONFIG = {
  minCoverage: 80,        // Coverage mínimo de testes
  maxComplexity: 10,      // Complexidade máximada função
  maxDuplication: 15,      // Duplicação máxima permitida
  maxBundleIncrease: 5,    // Aumento máximo do bundle (%)
  minPerformanceScore: 90, // Score mínimo de performance
  minSecurityScore: 90,   // Score mínimo de segurança
};
```

---

**Skill desenvolvida para Gold Mustache Barbearia** 🧔‍♂️✨

Garante qualidade consistente em todo o código antes de cada commit!
