---
paths:
  - "src/app/api/**/*"
  - "src/lib/**/*"
  - "src/services/**/*"
---

# Security

- Validar entrada com Zod em route handlers.
- Verificar sessão Supabase antes de operações sensíveis.
- Nunca expor stack traces ao cliente.
- Nunca commitar secrets.
- Queries Prisma com `select`/`include` mínimos.
