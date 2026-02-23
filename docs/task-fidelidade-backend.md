# Task: Implementação do Programa de Fidelidade (Fase 1 e 2 - Core & APIs)

**Status:** Feito
**Prioridade:** Alta
**Estimativa:** 4-6 dias
**Impacto Esperado:** Criação da base de dados e regras de negócio para retenção de clientes por pontos e níveis (Bronze, Prata, Ouro, Diamante).

## 🎯 Objetivo
Implementar a infraestrutura básica (Banco de Dados e Serviços Next.js) do Programa de Fidelidade descrito no plano técnico original (`loyalty-system-plan.md`), habilitando a geração de pontos a cada agendamento concluído.

## ✅ Requisitos Funcionais e Técnicos

1. **Modelagem de Dados (Prisma):**
   - Criar `LoyaltyAccount` vinculado a 1-para-1 com `Profile`.
   - Criar `PointTransaction` para log imutável de ganhos e perdas de pontos.
   - Criar `Reward` e `Redemption` para gerenciar catálogo de prêmios e resgates.

2. **Regras de Negócio Core (`loyalty.config.ts`):**
   - 10 pontos a cada R$ 10 gastos.
   - Bônus de 50 pontos para o 1º agendamento.
   - Cálculo dinâmico de Tiers:
     - Bronze (0-499)
     - Prata (500-1499) - 10% bônus
     - Ouro (1500-2999) - 20% bônus
     - Diamante (3000+) - 30% bônus

3. **Integração de Eventos Rest API:**
   - Criar Webhook local / Função Trigger que, ao alterar o status do `Appointment` para `COMPLETED`, calcule o valor pago e injete os pontos na conta do `Profile`.

4. **APIs Cliente:**
   - `GET /api/loyalty/account` (Retorna saldo, tier atual e progresso para o próximo).
   - `GET /api/loyalty/transactions` (Histórico paginado).

## 🛠 Passos de Implementação (Checklist Base)

- [x] **1. Schema Prisma:** Adicionar os *enum* `LoyaltyTier` e `PointTransactionType`, e os *models* `LoyaltyAccount`, `PointTransaction`, `Reward` e `Redemption` no arquivo `prisma/schema.prisma`.
- [ ] **2. Prisma Migrate:** Rodar e aplicar as novas tabelas ao banco de dados `pnpm db:migrate:dev`.
- [x] **3. Configuração Constants:** Criar o arquivo de configurações mágicas em `src/config/loyalty.config.ts`.
- [x] **4. Services Camada de Negócios:** Criar pasta `src/services/loyalty` contendo `loyalty.service.ts` e `points.calculator.ts` rigorosamente tipados.
- [x] **5. Gatilho de Agendamento:** Interceptar o `payment.service.ts` ou `appointment.service.ts` atual para chamar `creditPoints` caso o status mude para finalizado.
- [x] **6. APIs Next:** Criar as rotas correspondentes na pasta `src/app/api/loyalty/` protegidas pelo middleware de autenticação (`auth.ts`).

## 📎 Referências / Arquivos Mapeados
- **Documento mãe:** `docs/loyalty-system-plan.md`
- **Banco de Dados:** `prisma/schema.prisma`
- **Serviços de Agendamento (para o Hook):** `src/services/booking/` ou similar dependendo da arquitetura.
