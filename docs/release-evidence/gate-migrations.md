# Gate: pnpm db:migrate:status

**Data:** 2026-03-19
**Branch:** staging
**Commit:** 5791c8c
**Resultado:** PENDENTE — requer credenciais de banco configuradas localmente

## Erro ao executar localmente

```
Error: P1012 — Environment variable not found: DIRECT_URL
```

Este erro é esperado: o ambiente local não possui `DATABASE_URL` e `DIRECT_URL`
apontando para o banco de staging/produção.

## Como executar

Configurar `.env` com as credenciais reais e rodar:

```bash
pnpm db:migrate:status
```

Critério de aprovação: output `All migrations have been applied` sem pendências.

## Verificação alternativa via CI

O CI em `.github/workflows/ci.yml` configura um banco PostgreSQL local para rodar
os testes — mas `pnpm migrate:status` não é executado no CI atual.

## Ação requerida

**Responsável técnico deve executar manualmente com acesso ao banco de staging/produção:**

```bash
# Com DATABASE_URL e DIRECT_URL apontando para o banco alvo:
pnpm db:migrate:status
```

Registrar resultado abaixo:

- Data de execução: ______________________
- Resultado: [ ] Todas aplicadas / [ ] Há pendências (listar)
- Migrations pendentes (se houver): ______________________

## Status: ⏳ AGUARDANDO VALIDAÇÃO MANUAL
