# Design — Codebase Hardening

## Overview

Fixes pontuais de qualidade. Sem nova arquitetura — apenas alinhar código existente com padrões do projeto.

## Mudanças por Área

### i18n (Req 1)

Adicionar chaves de tradução em `messages/pt-BR.json` e `messages/en.json`:
- `common.schedule` → "Agendar" / "Book"
- `common.share` → "Compartilhar" / "Share"
- `common.changeLanguage` → "Mudar idioma" / "Change language"

Nos componentes, usar `useTranslations('common')` ou `t()`.

### Acessibilidade (Req 2)

`star-rating.tsx` — quando `isInteractive === false`:
- Adicionar `role="img"` ao container `div`
- Adicionar `aria-label={t('starRating', { rating, max: 5 })}` com i18n

### Design Tokens (Req 3)

`loading-elevator.tsx` — mapear:
- `#0B0B0B` → `hsl(var(--background))` ou criar `--loading-bg`
- `#D4AF37` → `hsl(var(--brand-gold))` (já existente em globals.css)
- `#E5C158` → `hsl(var(--brand-gold-light))` (verificar se existe ou criar)

### Dead Code (Req 4)

Deletar `src/components/ui/navigation-menu.tsx` e qualquer test associado.

### Auth Guards (Req 5)

Converter pages `"use client"` para server components com auth check:
```typescript
const session = await getServerSession();
if (!session || session.user.role !== 'ADMIN') redirect('/login');
```
Componentes interativos viram Client Components filhos.

### Service Layer (Req 6)

Extrair lógica Prisma dos route handlers para services dedicados. Route handlers passam a chamar service. Sem mudança de API.

### Testes (Req 7)

Criar test files seguindo padrão existente (`__tests__/` ao lado do source). Mock Prisma com `vi.mock`.

### Specs Housekeeping (Req 8)

Verificar testes existentes vs tasks marcadas como pendentes. Marcar `[x]` onde aplicável.
