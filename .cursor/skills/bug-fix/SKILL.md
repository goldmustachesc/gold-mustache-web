---
name: bug-fix
description: Workflow sistemático para investigação e correção de bugs. Use quando o usuário reportar um bug, erro, comportamento inesperado, ou quando precisar debugar um problema no sistema.
---

# Bug Fix - Gold Mustache

## Instruções

Siga este fluxo sistemático ao investigar e corrigir bugs:

### Fase 1: Entendimento

1. **Reproduza o problema**: Entenda exatamente o que acontece vs. o que deveria acontecer.
2. **Colete evidências**:
   - Mensagem de erro exata
   - Stack trace (se disponível)
   - Endpoint/página afetada
   - Passos para reproduzir
3. **Classifique a severidade**:

| Severidade | Critério |
|------------|----------|
| **P0 - Crítico** | Sistema fora do ar, perda de dados, segurança |
| **P1 - Alto** | Feature principal quebrada, sem workaround |
| **P2 - Médio** | Feature parcialmente quebrada, tem workaround |
| **P3 - Baixo** | Cosmético, edge case raro |

### Fase 2: Investigação

#### 2.1 Localização do Problema

Pesquise sistematicamente:

1. **Busque pelo erro**: Procure a mensagem de erro no codebase.
2. **Trace o fluxo**: Siga o caminho da requisição/interação:
   - UI Component → Hook/Handler → API Route → Service → Database
3. **Verifique mudanças recentes**:

```bash
git log --oneline -20
git diff main...HEAD -- [arquivo-suspeito]
```

#### 2.2 Análise de Causa Raiz

Antes de corrigir, responda:
- **O que mudou?** Código recente, dependência atualizada, dados diferentes?
- **Por que funcionava antes?** Condição que mudou?
- **Onde mais pode ocorrer?** O mesmo padrão existe em outros lugares?

#### 2.3 Análise de Impacto

Verifique se o bug pode existir em outros pontos:

```bash
# Busque padrões similares ao código com bug
rg "padrão-problemático" src/
```

### Fase 3: Correção

1. **Crie branch**:

```bash
git checkout -b fix/descricao-curta-do-bug
```

2. **Implemente a correção mínima**: Resolva a causa raiz, não apenas o sintoma.

3. **Corrija ocorrências similares**: Se o mesmo padrão existir em outros lugares, corrija todos.

4. **Valide a correção**:

```bash
pnpm lint
pnpm build
```

5. **Teste manualmente**:
   - [ ] Bug original resolvido
   - [ ] Funcionalidade adjacente não quebrou
   - [ ] Edge cases testados
   - [ ] Ocorrências similares corrigidas

### Fase 4: Commit

```
fix(modulo): descrição do bug corrigido

Causa: [explicação da causa raiz]
Correção: [o que foi feito para resolver]
```

## Padrões Comuns de Bug neste Projeto

### API Route sem tratamento de erro

```typescript
// PROBLEMA: erro não tratado propaga stack trace
const data = await prisma.service.findMany();

// CORREÇÃO: wrap com try/catch e resposta adequada
try {
  const data = await prisma.service.findMany();
  return NextResponse.json(data);
} catch (error) {
  console.error("[API] Erro:", error);
  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 }
  );
}
```

### Prisma query sem select/include correto

```typescript
// PROBLEMA: retorna todos os campos incluindo sensíveis
const user = await prisma.profile.findUnique({ where: { id } });

// CORREÇÃO: selecione apenas campos necessários
const user = await prisma.profile.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});
```

### Falta de validação de sessão

```typescript
// PROBLEMA: rota acessível sem autenticação
export async function GET() { /* ... */ }

// CORREÇÃO: verificar sessão Supabase
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
```

## Checklist de Debugging

- [ ] Erro reproduzido consistentemente
- [ ] Causa raiz identificada (não apenas sintoma)
- [ ] Correção aplicada no ponto correto
- [ ] Padrão similar verificado em outros arquivos
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
- [ ] Teste manual confirma correção
- [ ] Funcionalidades adjacentes não afetadas
