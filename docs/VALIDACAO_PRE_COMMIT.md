# 🚀 Validação Pré-Commit Automatizada

Este projeto possui um sistema de validação automática para garantir a qualidade do código antes de cada commit.

## 📋 Como Funciona

### 1. Script de Validação
- **Arquivo**: `scripts/validate-commit.cjs`
- **Comando**: `pnpm validate-commit`

### 2. Verificações Executadas
- ✅ **Linting**: Verificações de código com Biome
- ✅ **Build**: Build de produção para validar TypeScript
- ⚠️ **Testes**: Execução de testes (não bloqueante por enquanto)

### 3. Hook Automático (Opcional)
- **Arquivo**: `.husky/pre-commit-validate`
- **Execução**: Automática antes de cada commit

## 🔧 Como Usar

### Validação Manual
```bash
pnpm validate-commit
```

### Instalar Hook Automático
```bash
# Copiar o hook para o pre-commit existente
cp .husky/pre-commit-validate .husky/pre-commit
```

### Remover Hook Automático
```bash
# Remover o hook do pre-commit
rm .husky/pre-commit
```

## 🎯 Benefícios

1. **Prevenção de Erros**: Impede commit de código com problemas
2. **Qualidade Garantida**: Mantém padrões de código e build funcionando
3. **Feedback Rápido**: Identifica problemas antes de chegar no PR
4. **Integração Suave**: Funciona com fluxo de desenvolvimento existente

## 📊 Status das Verificações

- 🔴 **Críticas**: Impedem o commit (lint, build)
- 🟡 **Avisos**: Não bloqueiam mas recomendam correção
- ✅ **Sucesso**: Permite prosseguir com o commit

## 🛠️ Configuração

### Adicionar Nova Verificação
Edite `scripts/validate-commit.cjs`:

```javascript
{
  command: 'pnpm novo-comando',
  description: 'Descrição da verificação',
  required: true // false para não bloquear
}
```

### Personalizar Mensagens
Modifique as cores e textos no objeto `COLORS` e funções `log()`.

## 🔍 Resolução de Problemas

### Erros Comuns

1. **Lint falhando**:
   ```bash
   pnpm lint
   # Corrija os erros reportados
   ```

2. **Build falhando**:
   ```bash
   pnpm build
   # Verifique erros de TypeScript
   ```

3. **Testes falhando**:
   ```bash
   pnpm test
   # Execute testes localmente
   ```

### Bypass Temporário (Emergência)
```bash
git commit --no-verify
# ⚠️ Use apenas em casos de emergência
```

## 📈 Melhorias Futuras

- [ ] Integração com CI/CD
- [ ] Verificação de dependências
- [ ] Análise de segurança automatizada
- [ ] Coverage de testes obrigatório
- [ ] Formatação automática de código

---

**Nota**: Este sistema complementa as ferramentas existentes como `pre-commit-check` e não as substitui.
