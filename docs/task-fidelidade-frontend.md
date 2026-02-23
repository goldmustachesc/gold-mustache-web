# Task: Implementação do Programa de Fidelidade (Fases 5 e 6 - UI Dashboard & Admin)

**Status:** A Fazer
**Prioridade:** Média (Depende das Fases 1 a 4)
**Estimativa:** 5-7 dias
**Impacto Esperado:** Interface intuitiva para que clientes acompanhem seus pontos, níveis (Tiers) e resgatem recompensas, e visão de relatórios e gestão de bônus pro admin.

## 🎯 Objetivo
Desenvolver as telas Next.js (Server e Client Components) e componentes shadcn/ui para o usuário interagir com o Sistema de Fidelidade e seus Tiers de Recompensa.

## ✅ Requisitos Funcionais e Técnicos

1. **Dashboard do Cliente (`/locale/loyalty`):**
   - Exibir o `LoyaltyCard` detalhando pontos vitais e pontos atuais.
   - Componente `TierBadge` mostrando o nível (Bronze, Prata, Ouro, Diamante).
   - Componente `TierProgress` para mostrar visualmente (barra de progresso) quantos pontos faltam para o próximo nível.
   - Consumir via `TanStack Query` os dados do usuário a partir da rota de API `/api/loyalty/account`.

2. **Catálogo de Recompensas (`/locale/loyalty/rewards`):**
   - Listagem em Grid dos prêmios (Descontos e Serviços Grátis).
   - Componente `RewardCard` com botão de resgatar.
   - Ao resgatar, gerar o código único `RedemptionCode` em um Modal (Dialog component).
   - Consumir a API `/api/loyalty/rewards` gerada no backend.

3. **Histórico e Indicação (`/locale/loyalty/history` | `/locale/loyalty/referral`):**
   - Listagem (Tabela ou Lista customizada) do extrato de transações de pontos.
   - Tela com código de referral copiável para o usuário convidar amigos e ambos ganharem pontos.

4. **Painel Admin (`/locale/admin/loyalty`):**
   - Listar todas as contas cadastradas e saldo.
   - Opção para "Ajuste Manual" de pontos de um usuário específico via `Dialog/Form`.
   - Toggle para Ativar/Inativar itens do catálogo de Prêmios.

## 🛠 Passos de Implementação (Checklist Base)

- [ ] **1. Componentes Shadcn Base:** Garantir que `Card`, `Progress`, e `Dialog` estejam instalados `npx shadcn@latest add card progress dialog`.
- [ ] **2. Tabela Dicionário (i18n):** Criar as chaves traduzidas pertinentes aos tiers e termos de fidelidade nos JSONs (ex. "Você está no nível Bronze", "Faltam X pontos para Prata").
- [ ] **3. LoyaltyCard UI:** Criar o componente central reutilizável `LoyaltyCard.tsx` com as props de Tier.
- [ ] **4. RewardCard UI:** Criar o card de produto `RewardCard.tsx` exibindo imagem, descrição e valor em pontos.
- [ ] **5. Página Principal Cliente:** Criar o layout e page em `src/app/[locale]/(client)/loyalty/page.tsx` orquestrando os novos componentes e *data fetching*.
- [ ] **6. Views de Acesso:** Criar o link "Fidelidade" no menu ou em "Minha Conta" (`UserNavigation`).
- [ ] **7. Página Admin Overview:** Criar a tabela administrativa das contas e botões de reajuste.
- [ ] **8. Teste de Fluxo End-To-End:** Realizar login na plataforma, ver as métricas do banco local de desenvolvimento renderizadas na tela e fazer uma tentativa de resgate (mockada localmente).

## 📎 Referências / Arquivos Mapeados
- **Documento mãe:** `docs/loyalty-system-plan.md`
- **Variáveis de Estilos:** Usar variáveis `.bg-card`, `.text-muted-foreground` da raiz.
