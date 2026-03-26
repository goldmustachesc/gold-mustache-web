# Gold Mustache — Requisitos e User Stories

> Documento de referência com todas as funcionalidades do sistema organizadas por persona e módulo.
> Formato: User Stories com Acceptance Criteria (WHEN/THEN).

---

## Personas

| Persona | Descrição |
|---------|-----------|
| **Cliente** | Usuário autenticado via Supabase (email/senha ou Google OAuth) |
| **Convidado (Guest)** | Visitante que agenda sem criar conta, identificado por token |
| **Barbeiro** | Profissional com painel próprio, vinculado via `Barber.userId` |
| **Admin** | Administrador com `Profile.role = ADMIN`, acesso total |
| **Sistema** | Cron jobs e processos automáticos |

---

## 1. Autenticação

### US-AUTH-01: Cadastro por email
**Como** Cliente, **quero** me cadastrar com email, senha, nome e telefone, **para que** eu possa agendar e acompanhar meus horários.

- WHEN o usuário preenche o formulário de cadastro válido THEN o sistema cria conta no Supabase e Profile no banco
- WHEN o email já está em uso THEN o sistema retorna erro de email duplicado
- WHEN o cadastro é concluído THEN o sistema envia email de verificação
- WHEN o usuário tem agendamentos como convidado com o mesmo telefone THEN o sistema vincula esses agendamentos ao novo perfil

### US-AUTH-02: Login por email
**Como** Cliente, **quero** fazer login com email e senha, **para que** eu acesse meu painel.

- WHEN as credenciais são válidas THEN o sistema cria sessão via cookie
- WHEN as credenciais são inválidas THEN o sistema retorna erro de autenticação

### US-AUTH-03: Login com Google
**Como** Cliente, **quero** fazer login com minha conta Google, **para que** eu entre mais rápido.

- WHEN o usuário clica em "Entrar com Google" THEN o sistema redireciona para OAuth do Google
- WHEN o callback retorna com sucesso THEN o sistema marca email como verificado e cria/atualiza Profile

### US-AUTH-04: Recuperação de senha
**Como** Cliente, **quero** recuperar minha senha por email, **para que** eu recupere o acesso à minha conta.

- WHEN o usuário solicita reset THEN o sistema envia link de recuperação por email
- WHEN o usuário clica no link e define nova senha THEN a senha é atualizada

### US-AUTH-05: Reenvio de email de confirmação
**Como** Cliente, **quero** reenviar o email de confirmação, **para que** eu verifique minha conta se o email original não chegou.

- WHEN o usuário solicita reenvio THEN o sistema envia novo email de verificação

### US-AUTH-06: Proteção de rotas
**Como** Sistema, **quero** proteger rotas autenticadas, **para que** apenas usuários logados acessem áreas restritas.

- WHEN um usuário não autenticado acessa `/dashboard`, `/profile`, `/barbeiro` ou `/admin` THEN o middleware redireciona para `/login`
- WHEN um usuário autenticado acessa `/login` ou `/signup` THEN o middleware redireciona para `/dashboard`
- WHEN qualquer requisição chega THEN o middleware renova a sessão Supabase

---

## 2. Agendamento (Cliente Autenticado)

### US-BOOK-01: Ver serviços disponíveis
**Como** Cliente, **quero** ver a lista de serviços ativos, **para que** eu escolha o que desejo.

- WHEN o cliente acessa a página de agendamento THEN o sistema retorna serviços ativos com nome, duração e preço
- WHEN um `barberId` é fornecido THEN o sistema filtra serviços que o barbeiro oferece

### US-BOOK-02: Ver barbeiros disponíveis
**Como** Cliente, **quero** ver os barbeiros ativos, **para que** eu escolha com quem agendar.

- WHEN o cliente acessa a página THEN o sistema retorna barbeiros ativos com nome e foto

### US-BOOK-03: Ver horários disponíveis
**Como** Cliente, **quero** ver os slots livres para uma data, barbeiro e serviço, **para que** eu escolha o melhor horário.

- WHEN o cliente seleciona data, barbeiro e serviço THEN o sistema calcula slots disponíveis considerando working hours, ausências, fechamentos e agendamentos existentes
- WHEN não há slots disponíveis THEN o sistema retorna lista vazia
- WHEN o horário do slot tiver menos de 60 minutos de antecedência THEN o sistema marca o slot como indisponível (regra aplica-se a clientes e convidados; barbeiros consultam slots sem esta restrição)

### US-BOOK-04: Criar agendamento
**Como** Cliente, **quero** agendar um horário, **para que** eu garanta meu atendimento.

- WHEN o cliente submete um agendamento válido THEN o sistema cria com status CONFIRMED usando advisory lock para evitar conflitos
- WHEN o slot já está ocupado THEN o sistema retorna erro 409
- WHEN o agendamento online está desabilitado THEN o sistema retorna erro 403
- WHEN o agendamento é criado THEN o sistema envia notificação de confirmação
- WHEN o cliente tenta agendar com menos de 60 minutos de antecedência THEN o sistema retorna erro 400 (SLOT_TOO_SOON). Com exatamente 60 minutos, o agendamento é permitido

### US-BOOK-05: Ver meus agendamentos
**Como** Cliente, **quero** ver meus agendamentos futuros e passados, **para que** eu acompanhe minha agenda.

- WHEN o cliente acessa seus agendamentos THEN o sistema retorna lista com serviço, barbeiro, data, horário e status
- WHEN filtros de data são fornecidos THEN o sistema filtra pelo período

### US-BOOK-06: Cancelar agendamento
**Como** Cliente, **quero** cancelar um agendamento, **para que** eu libere o horário se não puder comparecer.

- WHEN o cliente cancela dentro do prazo permitido THEN o agendamento é marcado como CANCELLED_BY_CLIENT
- WHEN o cancelamento está fora do prazo THEN o sistema bloqueia o cancelamento
- WHEN o agendamento é cancelado THEN o barbeiro recebe notificação

---

## 3. Agendamento (Convidado)

### US-GUEST-01: Agendar sem conta
**Como** Convidado, **quero** agendar sem criar conta, **para que** eu marque rapidamente informando apenas nome e telefone.

- WHEN o convidado submete agendamento com nome e telefone THEN o sistema cria GuestClient, Appointment e retorna accessToken
- WHEN o telefone já existe como GuestClient THEN o sistema reutiliza o registro
- WHEN o convidado tenta agendar com menos de 60 minutos de antecedência THEN o sistema retorna erro 400 (SLOT_TOO_SOON), mesma regra do cliente autenticado

### US-GUEST-02: Consultar agendamentos por token
**Como** Convidado, **quero** ver meus agendamentos usando meu token, **para que** eu acompanhe o status.

- WHEN o convidado envia o token no header `X-Guest-Token` THEN o sistema retorna seus agendamentos

### US-GUEST-03: Cancelar agendamento por token
**Como** Convidado, **quero** cancelar um agendamento usando meu token, **para que** eu libere o horário.

- WHEN o token é válido e pertence ao agendamento THEN o cancelamento é processado
- WHEN o token não corresponde THEN o sistema retorna 403

### US-GUEST-04: Vincular conta ao se cadastrar
**Como** Convidado que criou conta, **quero** que meus agendamentos anteriores sejam vinculados, **para que** eu não perca meu histórico.

- WHEN um novo usuário se cadastra com telefone que existe em GuestClient THEN o sistema transfere os agendamentos para o Profile

---

## 4. Feedback

### US-FEED-01: Avaliar barbeiro após agendamento
**Como** Cliente, **quero** avaliar o barbeiro após meu atendimento, **para que** eu contribua com a qualidade do serviço.

- WHEN o cliente submete avaliação com rating (1-5) e comentário opcional THEN o feedback é criado vinculado ao agendamento
- WHEN já existe feedback para o agendamento THEN o sistema retorna erro 409

### US-FEED-02: Avaliar como convidado
**Como** Convidado, **quero** avaliar o barbeiro usando meu token, **para que** eu dê feedback mesmo sem conta.

- WHEN o convidado envia feedback com token válido THEN o feedback é criado

### US-FEED-03: Ver avaliações (barbeiro)
**Como** Barbeiro, **quero** ver minhas avaliações e estatísticas, **para que** eu acompanhe minha performance.

- WHEN o barbeiro acessa feedbacks THEN o sistema retorna lista paginada com rating médio, total e distribuição

### US-FEED-04: Ranking de barbeiros (admin)
**Como** Admin, **quero** ver o ranking de barbeiros por avaliação, **para que** eu identifique os melhores profissionais.

- WHEN o admin acessa o ranking THEN o sistema retorna barbeiros ordenados por rating médio

---

## 5. Programa de Fidelidade

### US-LOY-01: Ganhar pontos por agendamento
**Como** Cliente, **quero** ganhar pontos ao completar um agendamento, **para que** eu acumule benefícios.

- WHEN um agendamento é marcado como COMPLETED THEN o sistema calcula pontos baseado no valor do serviço e tier do cliente
- WHEN o cliente é SILVER THEN recebe 10% de bônus nos pontos
- WHEN o cliente é GOLD THEN recebe 20% de bônus
- WHEN o cliente é DIAMOND THEN recebe 30% de bônus

### US-LOY-02: Subir de tier
**Como** Cliente, **quero** subir de tier conforme acumulo pontos, **para que** eu tenha mais benefícios.

- WHEN o lifetime points atinge 500 THEN o tier sobe para SILVER
- WHEN atinge 1500 THEN sobe para GOLD
- WHEN atinge 3000 THEN sobe para DIAMOND

### US-LOY-03: Ver minha conta de fidelidade
**Como** Cliente, **quero** ver meus pontos, tier e transações, **para que** eu acompanhe meu progresso.

- WHEN o cliente acessa loyalty/account THEN o sistema retorna pontos atuais, lifetime, tier e referral code
- WHEN acessa transactions THEN retorna histórico paginado

### US-LOY-04: Ver recompensas disponíveis
**Como** Cliente, **quero** ver as recompensas que posso resgatar, **para que** eu saiba no que gastar meus pontos.

- WHEN o cliente acessa rewards THEN o sistema retorna recompensas ativas ordenadas por custo

### US-LOY-05: Gerenciar recompensas (admin)
**Como** Admin, **quero** criar, editar e desativar recompensas, **para que** eu controle o programa.

- WHEN o admin cria uma recompensa THEN ela fica disponível para resgate
- WHEN o admin desativa uma recompensa com resgates pendentes THEN o sistema bloqueia a desativação

---

## 6. Perfil e LGPD

### US-PROF-01: Editar perfil
**Como** Cliente, **quero** editar meus dados pessoais, **para que** minhas informações estejam atualizadas.

- WHEN o cliente atualiza o perfil THEN os dados são salvos com validação Zod

### US-PROF-02: Exportar dados (LGPD)
**Como** Cliente, **quero** exportar todos os meus dados, **para que** eu exerça meu direito de portabilidade (LGPD).

- WHEN o cliente solicita exportação THEN o sistema retorna JSON com perfil, agendamentos, feedbacks e consentimentos
- WHEN requisições excedem o limite THEN o sistema retorna 429

### US-PROF-03: Deletar conta (LGPD)
**Como** Cliente, **quero** deletar minha conta e dados, **para que** eu exerça meu direito de exclusão (LGPD).

- WHEN o cliente confirma deleção THEN o sistema remove agendamentos, perfil e auth user
- WHEN a requisição não tem origem válida THEN o sistema bloqueia (proteção CSRF)

### US-PROF-04: Solicitar deleção como convidado (LGPD)
**Como** Convidado, **quero** solicitar exclusão dos meus dados, **para que** eu exerça meu direito mesmo sem conta.

- WHEN o convidado envia telefone e/ou token THEN o sistema processa a solicitação

### US-PROF-05: Consentimento de cookies (LGPD)
**Como** Visitante, **quero** escolher quais cookies aceito, **para que** eu controle minha privacidade.

- WHEN o visitante define preferências THEN o sistema salva consentimento com IP e user-agent
- WHEN o visitante é autenticado THEN o consentimento é vinculado ao userId

---

## 7. Notificações

### US-NOTIF-01: Receber notificação de agendamento confirmado
**Como** Cliente, **quero** ser notificado quando meu agendamento é confirmado, **para que** eu tenha certeza da reserva.

### US-NOTIF-02: Receber notificação de cancelamento
**Como** Cliente/Barbeiro, **quero** ser notificado quando um agendamento é cancelado, **para que** eu saiba da mudança.

### US-NOTIF-03: Receber lembrete
**Como** Cliente, **quero** receber lembrete antes do agendamento, **para que** eu não esqueça.

### US-NOTIF-04: Gerenciar notificações
**Como** Cliente, **quero** ver e marcar notificações como lidas, **para que** eu acompanhe atualizações.

- WHEN o cliente acessa notificações THEN o sistema retorna lista com contador de não lidas
- WHEN marca como lida THEN o contador é atualizado
- WHEN marca todas como lidas THEN o sistema atualiza em batch

---

## 8. Painel do Barbeiro

### US-BARB-01: Ver minha agenda
**Como** Barbeiro, **quero** ver meus agendamentos por período, **para que** eu organize meu dia.

- WHEN o barbeiro acessa sua agenda THEN o sistema retorna agendamentos com dados do cliente e serviço

### US-BARB-02: Criar agendamento para cliente
**Como** Barbeiro, **quero** agendar diretamente para um cliente, **para que** eu registre atendimentos presenciais.

- WHEN o barbeiro cria agendamento THEN o sistema registra com mesmas regras de conflito

### US-BARB-03: Gerenciar horários de trabalho
**Como** Barbeiro, **quero** definir meus horários por dia da semana, **para que** os slots reflitam minha disponibilidade.

- WHEN o barbeiro atualiza working hours THEN os slots futuros são recalculados

### US-BARB-04: Gerenciar ausências
**Como** Barbeiro, **quero** registrar folgas e ausências, **para que** ninguém agende nesses períodos.

- WHEN o barbeiro cria ausência THEN os slots daquela data/período são bloqueados

### US-BARB-05: Gerenciar clientes
**Como** Barbeiro, **quero** ver e cadastrar clientes, **para que** eu mantenha minha carteira atualizada.

- WHEN o barbeiro busca clientes THEN o sistema retorna clientes registrados e guests com busca por nome

### US-BARB-06: Ver financeiro
**Como** Barbeiro, **quero** ver meu faturamento mensal, **para que** eu acompanhe meus ganhos.

- WHEN o barbeiro acessa financeiro THEN o sistema retorna receita, agendamentos, breakdown por serviço e receita diária

### US-BARB-07: Marcar no-show
**Como** Barbeiro, **quero** marcar um cliente como no-show, **para que** eu registre a ausência.

- WHEN o barbeiro marca no-show em agendamento CONFIRMED THEN o status muda para NO_SHOW

### US-BARB-08: Completar agendamento
**Como** Barbeiro, **quero** marcar um agendamento como concluído, **para que** o cliente ganhe pontos de fidelidade.

- WHEN o barbeiro marca como COMPLETED THEN o sistema credita pontos de fidelidade ao cliente

---

## 9. Painel do Admin

### US-ADM-01: Gerenciar configurações da barbearia
**Como** Admin, **quero** editar nome, endereço, contato e configurações de booking, **para que** o site reflita informações atuais.

### US-ADM-02: Gerenciar serviços
**Como** Admin, **quero** criar, editar e desativar serviços, **para que** o catálogo esteja atualizado.

- WHEN o admin cria serviço THEN o sistema gera slug único automaticamente

### US-ADM-03: Gerenciar barbeiros
**Como** Admin, **quero** cadastrar e gerenciar barbeiros, **para que** a equipe esteja atualizada.

### US-ADM-04: Gerenciar horários da loja
**Como** Admin, **quero** definir horários de funcionamento por dia da semana, **para que** os slots respeitem o horário da loja.

### US-ADM-05: Gerenciar fechamentos
**Como** Admin, **quero** cadastrar feriados e fechamentos, **para que** ninguém agende nesses dias.

### US-ADM-06: Ver financeiro geral
**Como** Admin, **quero** ver o faturamento geral e por barbeiro, **para que** eu acompanhe a saúde do negócio.

- WHEN o admin acessa financeiro sem barberId THEN o sistema soma todos os barbeiros
- WHEN fornece barberId THEN filtra por aquele barbeiro

### US-ADM-07: Ver feedbacks e ranking
**Como** Admin, **quero** ver todos os feedbacks e ranking de barbeiros, **para que** eu monitore a qualidade.

---

## 10. Cron Jobs (Sistema)

### US-CRON-01: Sincronizar Instagram
**Como** Sistema, **quero** sincronizar posts do Instagram periodicamente, **para que** o feed do site esteja atualizado.

- WHEN o cron executa com CRON_SECRET válido THEN o sistema busca posts da API do Instagram e salva em cache
- WHEN a API falha THEN o sistema faz retry (até 3 tentativas com backoff)

### US-CRON-02: Limpeza de dados de convidados (LGPD)
**Como** Sistema, **quero** anonimizar dados de convidados antigos, **para que** o sistema esteja em conformidade com a LGPD.

- WHEN o cron executa THEN o sistema anonimiza guests sem agendamentos nos últimos 2 anos
- WHEN há guests marcados para deleção THEN o sistema processa em batches de 50

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Slot** | Horário disponível para agendamento (ex: 10:30) |
| **Advisory Lock** | Lock no PostgreSQL que serializa criações de agendamento para o mesmo barbeiro/data |
| **Tier** | Nível de fidelidade (BRONZE, SILVER, GOLD, DIAMOND) |
| **Guest Token** | UUID gerado no agendamento sem conta, usado para consultar/cancelar |
| **Working Hours** | Horários de trabalho configurados por barbeiro e dia da semana |
| **Shop Hours** | Horários de funcionamento da loja (global) |
| **No-Show** | Cliente que agendou mas não compareceu |
