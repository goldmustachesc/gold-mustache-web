# Gold Mustache — Diagramas de Fluxo e Sequência

> Passo a passo dos processos mais complexos do sistema.
> Cada diagrama usa Mermaid (renderiza no GitHub e VS Code).

---

## 1. Fluxo de Middleware (toda requisição)

```mermaid
flowchart TD
    A[Request chega] --> B{Caminho começa com /api?}

    B -->|Sim| C[updateSession - renova cookie Supabase]
    C --> D[Retorna supabaseResponse]

    B -->|Não| E[updateSession - renova cookie Supabase]
    E --> F[Remove locale do path]
    F --> G{Rota protegida?}

    G -->|Sim| H{Usuário autenticado?}
    H -->|Não| I[Redirect para /login?redirect=path]
    H -->|Sim| J[Continua]

    G -->|Não| K{Rota de auth?}
    K -->|Sim| L{Usuário autenticado?}
    L -->|Sim| M[Redirect para /dashboard]
    L -->|Não| N[Continua]

    K -->|Não| N
    J --> O[Aplica i18n middleware]
    N --> O
    O --> P[Merge cookies Supabase + i18n]
    P --> Q[Retorna resposta]
```

**Rotas protegidas:** `/dashboard`, `/profile`, `/barbeiro`, `/admin`
**Rotas de auth:** `/login`, `/signup`, `/reset-password`
**Locales:** `pt-BR`, `es`, `en`

---

## 2. Fluxo de Autenticação

### 2.1 Cadastro (Email/Senha)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend
    participant SA as Supabase Auth
    participant API as API /profile/me
    participant DB as PostgreSQL
    participant GL as GuestLinkingService

    U->>F: Preenche nome, email, senha, telefone
    F->>SA: signUp(email, password, metadata)
    SA-->>F: User criado + email de verificação enviado
    F-->>U: "Verifique seu email"

    U->>SA: Clica no link de verificação
    SA->>F: Redirect para /auth/callback?code=xxx&type=signup
    F->>SA: exchangeCodeForSession(code)
    SA-->>F: Session criada

    F->>API: GET /profile/me
    API->>DB: Profile.findUnique(userId)
    alt Profile não existe
        API->>DB: Profile.create(userId, metadata)
        API->>GL: linkGuestAppointmentsToProfile(profileId, phone)
        GL->>DB: Transfere appointments de GuestClient com mesmo phone
    end
    API-->>F: { profile, email }
```

### 2.2 Login com Google (OAuth)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend
    participant SA as Supabase Auth
    participant G as Google OAuth
    participant CB as /auth/callback
    participant DB as PostgreSQL

    U->>F: Clica "Entrar com Google"
    F->>SA: signInWithOAuth(provider: google)
    SA->>G: Redirect para Google
    G-->>SA: Authorization code
    SA->>CB: Redirect com code
    CB->>SA: exchangeCodeForSession(code)
    SA-->>CB: Session + User

    CB->>DB: Profile.updateMany(emailVerified: true)
    CB-->>F: Redirect para /dashboard
```

---

## 3. Fluxo de Agendamento (Cliente Autenticado)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as Frontend
    participant SVC as GET /api/services
    participant BAR as GET /api/barbers
    participant SLT as GET /api/slots
    participant APT as POST /api/appointments
    participant DB as PostgreSQL
    participant NT as NotificationService
    participant BK as BookingService

    C->>F: Acessa página de agendamento
    F->>SVC: GET /api/services
    SVC-->>F: Lista de serviços ativos
    C->>F: Seleciona serviço

    F->>BAR: GET /api/barbers
    BAR-->>F: Lista de barbeiros ativos
    C->>F: Seleciona barbeiro

    F->>SLT: GET /api/slots?date=...&barberId=...&serviceId=...
    SLT->>BK: getAvailableSlots()
    Note over BK: Calcula slots considerando working hours, ausências, fechamentos e agendamentos existentes
    BK-->>SLT: TimeSlot[]
    SLT-->>F: Slots disponíveis
    C->>F: Seleciona horário

    F->>APT: POST /api/appointments { serviceId, barberId, date, startTime }
    APT->>APT: checkRateLimit(appointments)
    APT->>APT: Verifica bookingMode != disabled

    APT->>DB: BEGIN TRANSACTION
    APT->>DB: pg_advisory_xact_lock(barberId, date)
    Note over DB: Lock serializa criações para mesmo barbeiro+data
    APT->>DB: Verifica overlap com CONFIRMED appointments
    alt Slot ocupado
        APT-->>F: 409 Conflict
    else Slot livre
        APT->>DB: Appointment.create(status: CONFIRMED)
        APT->>DB: COMMIT
        APT->>NT: notifyAppointmentConfirmed(clientId, details)
        APT-->>F: 201 { appointment }
    end
```

---

## 4. Fluxo de Agendamento (Convidado / Guest)

```mermaid
sequenceDiagram
    actor G as Convidado
    participant F as Frontend
    participant APT as POST /api/appointments/guest
    participant DB as PostgreSQL
    participant LS as localStorage

    G->>F: Preenche nome, telefone, serviço, barbeiro, data, horário
    F->>APT: POST /api/appointments/guest { clientName, clientPhone, ... }

    APT->>APT: checkRateLimit(guestAppointments, 5/min)

    APT->>DB: GuestClient.upsert(phone)
    Note over DB: Cria ou reutiliza guest por phone

    APT->>DB: BEGIN TRANSACTION + advisory lock
    APT->>DB: Verifica overlap
    APT->>DB: Appointment.create + gerar accessToken (UUID)
    APT->>DB: COMMIT

    APT-->>F: 201 { appointment, accessToken }
    F->>LS: setGuestToken(accessToken)

    Note over G,LS: Token fica salvo no browser para consultas futuras

    G->>F: Acessa "Meus Agendamentos"
    F->>LS: getGuestToken()
    F->>APT: GET /api/appointments/guest/lookup (X-Guest-Token)
    APT->>DB: Appointment.findMany(guestClient.accessToken)
    APT-->>F: { appointments }
```

---

## 5. Fluxo de Cancelamento

```mermaid
flowchart TD
    A[Solicitação de cancelamento] --> B{Quem está cancelando?}

    B -->|Cliente autenticado| C{Dentro do prazo?}
    C -->|Sim| D[canClientCancel = true]
    D --> E[Status → CANCELLED_BY_CLIENT]
    C -->|Não| F{Prazo de alerta?}
    F -->|Sim| G[shouldWarnLateCancellation = true]
    G --> H[Mostra aviso mas permite cancelar]
    H --> E
    F -->|Não| I[isClientCancellationBlocked = true]
    I --> J[Bloqueado - não pode cancelar]

    B -->|Barbeiro| K[Obrigatório informar motivo]
    K --> L[Status → CANCELLED_BY_BARBER]

    B -->|Guest com token| M{Token válido?}
    M -->|Sim| N[Verifica ownership do appointment]
    N --> O[Status → CANCELLED_BY_CLIENT]
    M -->|Não| P[403 Forbidden]

    E --> Q[Notifica barbeiro]
    L --> R[Notifica cliente]
    O --> S[Sem notificação - guest]
```

---

## 6. Fluxo de Fidelidade (Loyalty)

### 6.1 Ganhar pontos

```mermaid
sequenceDiagram
    actor B as Barbeiro
    participant API as PATCH /appointments/[id]
    participant BK as BookingService
    participant DB as PostgreSQL
    participant LS as LoyaltyService
    participant PC as PointsCalculator

    B->>API: markAppointmentAsCompleted(id)
    API->>BK: markAppointmentAsCompleted(id, barberId)
    BK->>DB: Appointment.update(status: COMPLETED)

    alt Cliente autenticado (tem clientId)
        BK->>LS: getOrCreateAccount(profileId)
        LS->>DB: LoyaltyAccount.findUnique(profileId)
        alt Conta não existe
            LS->>DB: LoyaltyAccount.create(tier: BRONZE, referralCode: random)
        end

        BK->>PC: calculateAppointmentPoints(servicePrice, tier)
        Note over PC: base = floor(price / CURRENCY_UNIT) * POINTS_PER_CURRENCY
        Note over PC: total = floor(base * (1 + tierBonus))
        PC-->>BK: { base, bonus, total }

        BK->>LS: creditPoints({ accountId, type: EARNED_APPOINTMENT, points: total })
        LS->>DB: BEGIN TRANSACTION
        LS->>DB: PointTransaction.create(points, expiresAt)
        LS->>DB: LoyaltyAccount.update(currentPoints + total, lifetimePoints + total)
        LS->>DB: COMMIT

        LS->>LS: recalculateTier(accountId)
        LS->>PC: determineTier(lifetimePoints)
        alt Tier mudou
            LS->>DB: LoyaltyAccount.update(tier: newTier)
        end
    end

    BK-->>API: { appointment }
```

### 6.2 Tiers

```mermaid
flowchart LR
    A["BRONZE\n0 pts\n0% bonus"] -->|500 pts| B["SILVER\n500 pts\n10% bonus"]
    B -->|1500 pts| C["GOLD\n1500 pts\n20% bonus"]
    C -->|3000 pts| D["DIAMOND\n3000 pts\n30% bonus"]
```

---

## 7. Fluxo de Feedback

```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as Frontend
    participant API as POST /appointments/[id]/feedback
    participant FS as FeedbackService
    participant DB as PostgreSQL

    C->>F: Acessa agendamento COMPLETED
    F->>API: POST { rating: 5, comment: "Excelente!" }

    API->>API: Verifica auth + ownership
    API->>DB: Appointment.findUnique(id)

    alt Já tem feedback
        API-->>F: 409 "Já avaliou este agendamento"
    else Sem feedback
        API->>FS: createFeedback({ appointmentId, barberId, rating, comment }, clientId)
        FS->>DB: Feedback.create(...)
        FS-->>API: feedback
        API-->>F: 201 { feedback }
    end

    Note over DB: Barbeiro consulta GET /barbers/me/feedbacks
    Note over DB: Admin consulta GET /admin/feedbacks + /admin/barbers/ranking
```

---

## 8. Fluxo de Vinculação Guest → Profile

```mermaid
sequenceDiagram
    actor U as Novo Usuário
    participant API as GET /profile/me
    participant GL as GuestLinkingService
    participant DB as PostgreSQL

    Note over U: Usuário se cadastrou com telefone (11) 99999-9999

    U->>API: Primeiro acesso após cadastro
    API->>DB: Profile.findUnique(userId) → null
    API->>DB: Profile.create(userId, fullName, phone: "47999999999")

    API->>GL: linkGuestAppointmentsToProfile("prof-id", "47999999999")
    GL->>DB: GuestClient.findUnique(phone: "47999999999")

    alt GuestClient encontrado
        GL->>DB: Appointment.updateMany(guestClientId → clientId: "prof-id")
        GL->>DB: Feedback.updateMany(guestClientId → clientId: "prof-id")
        GL->>DB: GuestClient.delete(id)
        GL-->>API: { linked: true, appointmentsTransferred: 3, guestClientDeleted: true }
    else GuestClient não encontrado
        GL-->>API: { linked: false, appointmentsTransferred: 0, guestClientDeleted: false }
    end
```

---

## 9. Fluxo da API Route (padrão geral)

```mermaid
flowchart TD
    A[Request HTTP] --> B[Middleware: updateSession]
    B --> C[API Route Handler]
    C --> D{Precisa auth?}

    D -->|Admin| E[requireAdmin]
    E -->|ok: false| F[401/403]
    E -->|ok: true| G[Continua]

    D -->|Barber| H[createClient + getUser + findBarber]
    H -->|Não é barbeiro| F
    H -->|É barbeiro| G

    D -->|User| I[createClient + getUser]
    I -->|Não logado| F
    I -->|Logado| G

    D -->|Guest| J[Verifica X-Guest-Token]
    J -->|Token inválido| F
    J -->|Token válido| G

    D -->|Nenhuma| G

    G --> K{Rate limit?}
    K -->|Sim| L[checkRateLimit]
    L -->|Blocked| M[429 Too Many Requests]
    L -->|Allowed| N[Continua]
    K -->|Não| N

    N --> O{Origin check?}
    O -->|Sim| P[requireValidOrigin]
    P -->|Invalid| Q[403 Forbidden]
    P -->|Valid| R[Continua]
    O -->|Não| R

    R --> S[Validação Zod do body/params]
    S -->|Inválido| T[400 Bad Request]
    S -->|Válido| U[Chama Service]
    U --> V[Service acessa Prisma/DB]
    V --> W[Retorna JSON]

    U -->|Erro| X[handlePrismaError ou catch genérico]
    X --> Y[500 / status específico]
```
