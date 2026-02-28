# Gold Mustache — Diagrama de Classes

> Estrutura dos serviços, helpers e suas dependências no backend.
> Cada "classe" representa um módulo (`src/services/` ou `src/lib/`) com seus métodos públicos.

---

## Diagrama de Classes — Services

```mermaid
classDiagram
    class BookingService {
        +getServices(barberId?) Promise~ServiceData[]~
        +getAvailableSlots(date, barberId, serviceId) Promise~TimeSlot[]~
        +createAppointment(input, clientId) Promise~Appointment~
        +createGuestAppointment(input) Promise~GuestAppointmentResult~
        +createAppointmentByBarber(input, barberId) Promise~Appointment~
        +getClientAppointments(clientId) Promise~Appointment[]~
        +getBarberAppointments(barberId, dateRange) Promise~Appointment[]~
        +cancelAppointmentByClient(appointmentId, clientId) Promise~Appointment~
        +cancelAppointmentByBarber(appointmentId, barberId, reason) Promise~Appointment~
        +cancelAppointmentByGuestToken(appointmentId, accessToken) Promise~Appointment~
        +markAppointmentAsNoShow(appointmentId, barberId) Promise~Appointment~
        +markAppointmentAsCompleted(appointmentId, barberId) Promise~Appointment~
        +getGuestAppointmentsByToken(accessToken) Promise~Appointment[]~
        +canClientCancel(date, time) boolean
        +isClientCancellationBlocked(date, time) boolean
        +shouldWarnLateCancellation(date, time) boolean
    }

    class FeedbackService {
        +createFeedback(input, clientId) Promise~Feedback~
        +createGuestFeedback(input, accessToken) Promise~Feedback~
        +getAppointmentFeedback(appointmentId) Promise~Feedback?~
        +getBarberFeedbacks(barberId, page, pageSize) Promise~PaginatedFeedbacks~
        +getBarberFeedbackStats(barberId) Promise~FeedbackStats~
        +getAllFeedbacks(filters, page, pageSize) Promise~PaginatedFeedbacks~
        +getOverallFeedbackStats() Promise~FeedbackStats~
        +getBarberRanking() Promise~BarberRanking[]~
        +getBarberFeedbacksAdmin(barberId, page, pageSize) Promise~PaginatedFeedbacks~
    }

    class NotificationService {
        +createNotification(input) Promise~Notification~
        +getNotifications(userId) Promise~Notification[]~
        +getUnreadCount(userId) Promise~number~
        +markAsRead(notificationId, userId) Promise~void~
        +markAllAsRead(userId) Promise~void~
        +notifyAppointmentConfirmed(clientId, details) Promise~Notification~
        +notifyAppointmentCancelledByBarber(clientId, details) Promise~Notification~
        +notifyAppointmentCancelledByClient(barberUserId, details) Promise~Notification~
        +notifyBarberOfAppointmentCancelledByClient(appointment) Promise~void~
        +notifyAppointmentReminder(clientId, details) Promise~Notification~
    }

    class GuestLinkingService {
        +linkGuestAppointmentsToProfile(profileId, phone) Promise~LinkGuestResult~
    }

    class BarbershopSettingsService {
        +getBarbershopSettings() Promise~BarbershopSettingsData~
    }

    class InstagramService {
        +getInstagramUserId(accessToken) Promise~string~
        +fetchInstagramPosts(accessToken, userId, limit) Promise~InstagramPost[]~
        +validateInstagramConfig() ConfigValidation
    }

    class AuthService {
        +signUp(email, password, fullName, phone) Promise~AuthResponse~
        +signIn(email, password) Promise~AuthResponse~
        +signInWithGoogle() Promise~void~
        +signOut() Promise~void~
        +resetPassword(email) Promise~void~
        +updatePassword(password) Promise~void~
        +getUser() Promise~User?~
        +getSession() Promise~Session?~
        +resendConfirmationEmail(email) Promise~void~
    }

    class LoyaltyService {
        +createAccount(profileId) Promise~LoyaltyAccount~
        +getOrCreateAccount(profileId) Promise~LoyaltyAccount~
        +recalculateTier(accountId) Promise~void~
        +creditPoints(input) Promise~void~
        +debitPoints(input) Promise~void~
    }

    class PointsCalculator {
        +calculateBasePoints(amountSpent) number
        +applyTierBonus(basePoints, tier) number
        +calculateAppointmentPoints(amountSpent, tier) PointsBreakdown
        +determineTier(lifetimePoints) LoyaltyTier
    }

    %% Dependências entre services
    BookingService --> NotificationService : "notifica ao criar/cancelar"
    BookingService --> LoyaltyService : "credita pontos ao completar"
    LoyaltyService --> PointsCalculator : "calcula pontos e tier"
    GuestLinkingService --> BookingService : "transfere appointments"
```

---

## Diagrama de Classes — Lib (Auth, API, Booking)

```mermaid
classDiagram
    class RequireAdmin {
        +requireAdmin() Promise~RequireAdminResult~
    }
    note for RequireAdmin "Verifica Supabase auth + Profile.role === ADMIN"

    class VerifyOrigin {
        +verifyOrigin(request) OriginCheckResult
        +requireValidOrigin(request) NextResponse?
    }
    note for VerifyOrigin "Proteção CSRF via header Origin/Referer"

    class PrismaErrorHandler {
        +handlePrismaError(error, fallbackMessage) NextResponse
    }
    note for PrismaErrorHandler "Mapeia erros Prisma para HTTP status codes"

    class RateLimiter {
        +checkRateLimit(limiterType, identifier) Promise~RateLimitResult~
        +getClientIdentifier(request) string
        +isDistributedRateLimiting() boolean
    }
    note for RateLimiter "Upstash Redis com 4 limiters: appointments, guest, api, sensitive"

    class BookingMode {
        +resolveBookingMode(settings) BookingMode
        +buildBookingHref(options) string?
    }
    note for BookingMode "disabled | external | internal"

    class GuestSession {
        +getGuestToken() string?
        +setGuestToken(token) void
        +clearGuestToken() void
        +hasGuestToken() boolean
    }
    note for GuestSession "localStorage no browser"

    %% Dependências
    RequireAdmin --> SupabaseServer : "createClient + getUser"
    RequireAdmin --> Prisma : "Profile.findUnique"
    RateLimiter --> UpstashRedis : "Ratelimit"
    GuestSession --> LocalStorage : "browser-only"
```

---

## Camadas e Dependências

```mermaid
flowchart TB
    subgraph routes [API Routes - src/app/api/]
        R1[Appointments]
        R2[Profile]
        R3[Barber Panel]
        R4[Admin]
        R5[Loyalty]
        R6[Notifications]
        R7[Cron]
    end

    subgraph middleware [Middleware / Guards]
        M1[RequireAdmin]
        M2[VerifyOrigin]
        M3[RateLimiter]
        M4[PrismaErrorHandler]
    end

    subgraph services [Services - src/services/]
        S1[BookingService]
        S2[FeedbackService]
        S3[NotificationService]
        S4[GuestLinkingService]
        S5[LoyaltyService]
        S6[PointsCalculator]
        S7[BarbershopSettingsService]
        S8[InstagramService]
    end

    subgraph infra [Infraestrutura]
        DB[(PostgreSQL via Prisma)]
        Auth[Supabase Auth]
        Redis[Upstash Redis]
        IG[Instagram API]
    end

    routes --> middleware
    routes --> services
    services --> DB
    M1 --> Auth
    M1 --> DB
    M3 --> Redis
    S1 --> DB
    S1 --> S3
    S1 --> S5
    S2 --> DB
    S3 --> DB
    S4 --> DB
    S5 --> DB
    S5 --> S6
    S7 --> DB
    S8 --> IG
```

---

## Localização dos Arquivos

| Classe/Módulo | Arquivo |
|---------------|---------|
| BookingService | `src/services/booking.ts` |
| FeedbackService | `src/services/feedback.ts` |
| NotificationService | `src/services/notification.ts` |
| GuestLinkingService | `src/services/guest-linking.ts` |
| BarbershopSettingsService | `src/services/barbershop-settings.ts` |
| InstagramService | `src/services/instagram.ts` |
| AuthService | `src/services/auth.ts` (client-side) |
| LoyaltyService | `src/services/loyalty/loyalty.service.ts` |
| PointsCalculator | `src/services/loyalty/points.calculator.ts` |
| RequireAdmin | `src/lib/auth/requireAdmin.ts` |
| VerifyOrigin | `src/lib/api/verify-origin.ts` |
| PrismaErrorHandler | `src/lib/api/prisma-error-handler.ts` |
| RateLimiter | `src/lib/rate-limit.ts` |
| BookingMode | `src/lib/booking-mode.ts` |
| GuestSession | `src/lib/guest-session.ts` |
