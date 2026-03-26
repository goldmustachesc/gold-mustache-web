# Smoke Test Pós-Deploy — Produção

**Data do deploy:** ______________________
**Responsável:** ______________________
**URL de Produção:** https://www.goldmustachebarbearia.com.br
**Commit deployado:** ______________________

> Executar nos primeiros **5 minutos** após o deploy. Se qualquer item ❌, acionar rollback imediato.

---

## Checklist mínimo (< 5 min)

| Item | Como verificar | Resultado |
|------|---------------|-----------|
| Home carrega | Abrir `https://www.goldmustachebarbearia.com.br` | [ ] ✅ / [ ] ❌ |
| HTTPS responde corretamente | Verificar cadeado no browser | [ ] ✅ / [ ] ❌ |
| Banner de staging **NÃO** aparece | Inspecionar visualmente a home | [ ] ✅ / [ ] ❌ |
| `robots.txt` permite indexação | `curl https://www.goldmustachebarbearia.com.br/robots.txt` | [ ] ✅ / [ ] ❌ |
| Login funciona | Tentar login com Google | [ ] ✅ / [ ] ❌ |
| Logout funciona | Após login, fazer logout | [ ] ✅ / [ ] ❌ |
| Agendamento abre | Clicar em "Agendar" e verificar que o fluxo inicia | [ ] ✅ / [ ] ❌ |
| Admin acessível | Login como admin e abrir painel | [ ] ✅ / [ ] ❌ |

---

## Verificações extras (< 15 min, se tempo permitir)

| Item | Resultado |
|------|-----------|
| Cron sync-instagram executa (aguardar até 10h ou chamar manualmente) | [ ] ✅ / [ ] N/A |
| Rate limit ativo (Upstash — não está em fallback de memória) | [ ] ✅ / [ ] Verificar logs |
| Sem erros 500 nos logs da Vercel | [ ] ✅ / [ ] ❌ |

---

## Resultado Final

- [ ] **GO** — todos os itens críticos ✅, deploy bem-sucedido
- [ ] **ROLLBACK** — acionar procedimento em `docs/release-evidence/rollback-plan.md`

Observações: ______________________
