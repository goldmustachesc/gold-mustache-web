# Gate: pnpm start (modo produção)

**Data:** ______________________
**Branch:** staging
**Commit:** 5791c8c
**Resultado:** PENDENTE — requer execução manual com credenciais reais

## Pré-requisito

- `pnpm build` já passou ✅ (ver `gate-build.md`)
- Configurar `.env.local` com todas as variáveis de produção/staging
- Rodar `pnpm start`

## Critério de aprovação

- App sobe sem erros no terminal
- `http://localhost:3000` (ou porta configurada) retorna HTTP 200
- Home carrega sem erros no browser
- Sem erros 500 nos logs do servidor

## Como executar

```bash
pnpm start
# Acessar http://localhost:3000 no browser
```

## Ação requerida

Responsável deve executar com `.env` configurado e registrar:

- Data de execução: ______________________
- App subiu: [ ] Sim / [ ] Não
- Home carregou: [ ] Sim / [ ] Não
- Observações: ______________________

## Status: ⏳ AGUARDANDO VALIDAÇÃO MANUAL
