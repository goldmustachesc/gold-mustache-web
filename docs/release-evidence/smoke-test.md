# Smoke Test — Staging

**Data:** ______________________
**Responsável:** ______________________
**URL de Staging:** ______________________

---

## 3.1 — Público

| Item | Resultado |
|------|-----------|
| Home pública carrega sem erro | [ ] ✅ / [ ] ❌ |
| Catálogo de serviços e preços visível e correto | [ ] ✅ / [ ] ❌ |
| Seção: equipe | [ ] ✅ / [ ] ❌ |
| Seção: galeria | [ ] ✅ / [ ] ❌ |
| Seção: depoimentos | [ ] ✅ / [ ] ❌ |
| Seção: FAQ | [ ] ✅ / [ ] ❌ |
| Seção: contato | [ ] ✅ / [ ] ❌ |
| Banner de STAGING visível | [ ] ✅ / [ ] ❌ |

---

## 3.2 — Autenticação

| Item | Resultado |
|------|-----------|
| Login com Google funciona | [ ] ✅ / [ ] ❌ |
| Logout funciona | [ ] ✅ / [ ] ❌ |
| Callback de autenticação redireciona corretamente | [ ] ✅ / [ ] ❌ |
| Recuperação de senha funciona | [ ] ✅ / [ ] N/A |
| Perfil CLIENT carrega corretamente | [ ] ✅ / [ ] ❌ |
| Perfil BARBER carrega corretamente | [ ] ✅ / [ ] ❌ |
| Perfil ADMIN carrega corretamente | [ ] ✅ / [ ] ❌ |

---

## 3.3 — Agendamento

| Item | Resultado |
|------|-----------|
| Agendamento como cliente autenticado (início ao fim) | [ ] ✅ / [ ] ❌ |
| Agendamento como guest (início ao fim) | [ ] ✅ / [ ] ❌ |
| Cancelamento de agendamento | [ ] ✅ / [ ] ❌ |
| Conclusão de atendimento pelo barbeiro | [ ] ✅ / [ ] ❌ |

---

## 3.4 — Administrativo

| Item | Resultado |
|------|-----------|
| Painel do barbeiro funciona | [ ] ✅ / [ ] ❌ |
| Painel administrativo funciona | [ ] ✅ / [ ] ❌ |
| Gestão de serviços | [ ] ✅ / [ ] ❌ |
| Gestão de barbeiros | [ ] ✅ / [ ] ❌ |
| Gestão de horários globais | [ ] ✅ / [ ] ❌ |
| Gestão de ausências | [ ] ✅ / [ ] ❌ |

---

## 3.5 — Fidelidade e Feedback

| Item | Resultado |
|------|-----------|
| Fluxo de feedback funciona | [ ] ✅ / [ ] ❌ |
| Pontos de fidelidade creditados | [ ] ✅ / [ ] N/A |
| Resgate de recompensa | [ ] ✅ / [ ] N/A |
| Referral funciona | [ ] ✅ / [ ] N/A |

---

## 3.6 — Visual e Responsividade

| Item | Resultado |
|------|-----------|
| Mobile Chrome — sem quebras | [ ] ✅ / [ ] ❌ |
| Mobile Safari — sem quebras | [ ] ✅ / [ ] ❌ |
| Desktop Chrome — sem quebras | [ ] ✅ / [ ] ❌ |
| Desktop Safari — sem quebras | [ ] ✅ / [ ] ❌ |
| Desktop Firefox — sem quebras | [ ] ✅ / [ ] ❌ |
| Light mode — sem quebras | [ ] ✅ / [ ] ❌ |
| Dark mode — sem quebras | [ ] ✅ / [ ] ❌ |
| Navegação por teclado nas áreas principais | [ ] ✅ / [ ] ❌ |

---

## 3.7 — SEO por Ambiente

| Item | Resultado |
|------|-----------|
| `robots.txt` bloqueia indexação em staging | [ ] ✅ / [ ] ❌ |
| Sitemap retorna vazio em staging | [ ] ✅ / [ ] ❌ |
| Meta tags e canonical revisadas | [ ] ✅ / [ ] ❌ |

> Verificar `robots.txt`: `curl https://<staging-url>/robots.txt`
> Verificar sitemap: `curl https://<staging-url>/sitemap.xml`

---

## Status Final: [ ] APROVADO / [ ] BLOQUEADO

Bloqueadores encontrados:

-
-

Observações: ______________________
