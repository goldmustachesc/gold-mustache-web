# Gold Mustache — Diagrama de Entidade e Relacionamento

> Representação completa do banco de dados PostgreSQL gerenciado via Prisma ORM.
> Baseado em [`prisma/schema.prisma`](../../prisma/schema.prisma).

---

## Diagrama ER

```mermaid
erDiagram
    Profile {
        uuid id PK
        string userId UK "Supabase Auth ID"
        string fullName
        string avatarUrl
        string phone
        string street
        string number
        string complement
        string neighborhood
        string city
        string state
        string zipCode
        boolean emailVerified
        UserRole role "CLIENT | BARBER | ADMIN"
        date birthDate
        datetime createdAt
        datetime updatedAt
    }

    GuestClient {
        uuid id PK
        string fullName
        string phone UK
        string accessToken UK
        datetime createdAt
    }

    Service {
        uuid id PK
        string slug UK
        string name
        string description
        int duration "minutos"
        decimal price
        boolean active
        datetime createdAt
        datetime updatedAt
    }

    Barber {
        uuid id PK
        string userId UK "Supabase Auth ID"
        string name
        string avatarUrl
        boolean active
        datetime createdAt
        datetime updatedAt
    }

    BarberService {
        uuid barberId PK_FK
        uuid serviceId PK_FK
    }

    WorkingHours {
        uuid id PK
        uuid barberId FK
        int dayOfWeek "0=Dom 6=Sab"
        string startTime "HH:MM"
        string endTime "HH:MM"
        string breakStart
        string breakEnd
    }

    ShopHours {
        uuid id PK
        int dayOfWeek UK "0=Dom 6=Sab"
        boolean isOpen
        string startTime "HH:MM"
        string endTime "HH:MM"
        string breakStart
        string breakEnd
        datetime createdAt
        datetime updatedAt
    }

    ShopClosure {
        uuid id PK
        date date "INDEX"
        string startTime
        string endTime
        string reason
        datetime createdAt
        datetime updatedAt
    }

    BarberAbsence {
        uuid id PK
        uuid barberId FK "INDEX com date"
        date date
        string startTime
        string endTime
        string reason
        datetime createdAt
        datetime updatedAt
    }

    Appointment {
        uuid id PK
        uuid clientId FK "opcional"
        uuid guestClientId FK "opcional"
        uuid barberId FK "INDEX com date e startTime"
        uuid serviceId FK
        date date
        string startTime "HH:MM"
        string endTime "HH:MM"
        AppointmentStatus status "CONFIRMED | CANCELLED_* | COMPLETED | NO_SHOW"
        string cancelReason
        datetime createdAt
        datetime updatedAt
    }

    Feedback {
        uuid id PK
        uuid appointmentId FK_UK
        uuid barberId FK "INDEX"
        uuid clientId FK "INDEX opcional"
        uuid guestClientId FK "INDEX opcional"
        int rating "1 a 5"
        string comment
        datetime createdAt "INDEX"
    }

    Notification {
        uuid id PK
        string userId "Supabase Auth ID"
        NotificationType type
        string title
        string message
        json data
        boolean read
        datetime createdAt
    }

    BarbershopSettings {
        string id PK "sempre default"
        string name
        string shortName
        string tagline
        string description
        string street
        string number
        string neighborhood
        string city
        string state
        string zipCode
        string country
        decimal latitude
        decimal longitude
        string phone
        string whatsapp
        string email
        string instagramMain
        string instagramStore
        string googleMapsUrl
        boolean bookingEnabled
        string externalBookingUrl
        int foundingYear
        datetime createdAt
        datetime updatedAt
    }

    CookieConsent {
        uuid id PK
        string userId "opcional"
        string anonymousId "opcional"
        boolean analyticsConsent
        boolean marketingConsent
        string ipAddress
        string userAgent
        datetime consentDate
        datetime updatedAt
    }

    LoyaltyAccount {
        uuid id PK
        uuid profileId FK_UK
        int currentPoints
        int lifetimePoints
        LoyaltyTier tier "BRONZE | SILVER | GOLD | DIAMOND"
        string referralCode UK
        uuid referredById FK "auto-referencia"
        datetime createdAt
        datetime updatedAt
    }

    PointTransaction {
        uuid id PK
        uuid loyaltyAccountId FK "INDEX"
        PointTransactionType type
        int points "positivo=ganho negativo=gasto"
        string description
        string referenceId "INDEX"
        datetime expiresAt
        datetime createdAt
    }

    Reward {
        uuid id PK
        string name
        string description
        int pointsCost
        string type "DISCOUNT | FREE_SERVICE | PRODUCT"
        decimal value
        string serviceId
        string imageUrl
        boolean active
        int stock "null=ilimitado"
        datetime createdAt
        datetime updatedAt
    }

    Redemption {
        uuid id PK
        uuid loyaltyAccountId FK "INDEX"
        uuid rewardId FK "INDEX"
        int pointsSpent
        string code UK "INDEX"
        datetime usedAt
        datetime expiresAt
        datetime createdAt
    }

    %% Relacionamentos
    Profile ||--o{ Appointment : "clientId"
    Profile ||--o{ Feedback : "clientId"
    Profile ||--o| LoyaltyAccount : "profileId"

    GuestClient ||--o{ Appointment : "guestClientId"
    GuestClient ||--o{ Feedback : "guestClientId"

    Barber ||--o{ Appointment : "barberId"
    Barber ||--o{ Feedback : "barberId"
    Barber ||--o{ WorkingHours : "barberId"
    Barber ||--o{ BarberAbsence : "barberId"
    Barber ||--o{ BarberService : "barberId"

    Service ||--o{ Appointment : "serviceId"
    Service ||--o{ BarberService : "serviceId"

    Appointment ||--o| Feedback : "appointmentId"

    LoyaltyAccount ||--o{ PointTransaction : "loyaltyAccountId"
    LoyaltyAccount ||--o{ Redemption : "loyaltyAccountId"
    LoyaltyAccount ||--o{ LoyaltyAccount : "referredById"

    Reward ||--o{ Redemption : "rewardId"
```

---

## Enums

### UserRole
| Valor | Descrição |
|-------|-----------|
| `CLIENT` | Cliente padrão |
| `BARBER` | Barbeiro (também tem registro na tabela Barber) |
| `ADMIN` | Administrador com acesso total |

### AppointmentStatus
| Valor | Descrição |
|-------|-----------|
| `CONFIRMED` | Agendamento ativo |
| `CANCELLED_BY_CLIENT` | Cancelado pelo cliente |
| `CANCELLED_BY_BARBER` | Cancelado pelo barbeiro |
| `COMPLETED` | Atendimento concluído |
| `NO_SHOW` | Cliente não compareceu |

### NotificationType
| Valor | Descrição |
|-------|-----------|
| `APPOINTMENT_CONFIRMED` | Agendamento confirmado |
| `APPOINTMENT_CANCELLED` | Agendamento cancelado |
| `APPOINTMENT_REMINDER` | Lembrete de agendamento |
| `LOYALTY_POINTS_EARNED` | Pontos de fidelidade ganhos |
| `LOYALTY_TIER_UPGRADE` | Subiu de tier |
| `LOYALTY_POINTS_EXPIRING` | Pontos prestes a expirar |
| `LOYALTY_REWARD_REDEEMED` | Recompensa resgatada |
| `LOYALTY_REFERRAL_BONUS` | Bônus de indicação |
| `LOYALTY_BIRTHDAY_BONUS` | Bônus de aniversário |

### LoyaltyTier
| Valor | Pontos mínimos | Bônus |
|-------|----------------|-------|
| `BRONZE` | 0 | 0% |
| `SILVER` | 500 | 10% |
| `GOLD` | 1500 | 20% |
| `DIAMOND` | 3000 | 30% |

### PointTransactionType
| Valor | Descrição |
|-------|-----------|
| `EARNED_APPOINTMENT` | Ganhou por agendamento concluído |
| `EARNED_REFERRAL` | Ganhou por indicação |
| `EARNED_REVIEW` | Ganhou por avaliação |
| `EARNED_BIRTHDAY` | Bônus de aniversário |
| `EARNED_BONUS` | Bônus promocional |
| `REDEEMED` | Resgatou recompensa |
| `EXPIRED` | Pontos expirados |
| `ADJUSTED` | Ajuste manual (admin) |

---

## Indexes

| Tabela | Index | Campos |
|--------|-------|--------|
| ShopClosure | `@@index` | `[date]` |
| BarberAbsence | `@@index` | `[barberId, date]` |
| Appointment | `@@index` | `[barberId, date, startTime]` |
| Feedback | `@@index` | `[barberId]`, `[clientId]`, `[guestClientId]`, `[createdAt]` |
| PointTransaction | `@@index` | `[loyaltyAccountId]`, `[referenceId]` |
| Redemption | `@@index` | `[loyaltyAccountId]`, `[rewardId]`, `[code]` |

> **Nota:** Indexes faltantes identificados em `Notification.userId`, `Appointment.clientId`, `Appointment.guestClientId` e `CookieConsent.userId` — ver [task 013](../tasks-back-end/013-task-missing-db-indexes.md).

---

## Regras de Integridade

| Relação | onDelete | Motivo |
|---------|----------|--------|
| BarberService → Barber | `Cascade` | Serviço-barbeiro é join table |
| BarberService → Service | `Cascade` | Serviço-barbeiro é join table |
| WorkingHours → Barber | `Cascade` | Horários pertencem ao barbeiro |
| BarberAbsence → Barber | `Cascade` | Ausências pertencem ao barbeiro |
| Appointment → Barber | `Restrict` | Não pode deletar barbeiro com agendamentos |
| Appointment → Service | `Restrict` | Não pode deletar serviço com agendamentos |
| Appointment → Profile | *(não definido)* | Ver [task 022](../tasks-back-end/022-task-appointment-ondelete.md) |
| Appointment → GuestClient | *(não definido)* | Ver [task 022](../tasks-back-end/022-task-appointment-ondelete.md) |
| Feedback → Appointment | `Cascade` | Feedback é filho do agendamento |
| Feedback → Barber | `Cascade` | Feedback é do barbeiro |
| Feedback → Profile | `SetNull` | Mantém feedback se perfil for deletado |
| Feedback → GuestClient | `SetNull` | Mantém feedback se guest for deletado |
| LoyaltyAccount → Profile | `Cascade` | Conta fidelidade pertence ao perfil |
| Redemption → LoyaltyAccount | `Cascade` | Resgate pertence à conta |
| Redemption → Reward | `Restrict` | Não pode deletar reward com resgates |

---

## Concorrência

A tabela `Appointment` **não** possui constraint UNIQUE global. A unicidade de slots ativos é garantida por:

1. **Advisory Lock** (`pg_advisory_xact_lock`) por `barberId + date` antes de cada criação
2. **Overlap check** dentro da transação para verificar conflito com agendamentos CONFIRMED
3. Agendamentos cancelados não bloqueiam o slot para reagendamento
