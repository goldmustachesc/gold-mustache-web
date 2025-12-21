# Requirements Document

## Introduction

Sistema de agendamento moderno para a barbearia Gold Mustache que permite aos clientes agendar e gerenciar seus atendimentos de forma autônoma, enquanto os barbeiros têm visibilidade completa de sua agenda e podem gerenciar os agendamentos. O sistema inclui notificações em tempo real para ambas as partes.

## Glossary

- **Booking_System**: Sistema responsável por gerenciar agendamentos de serviços da barbearia
- **Client**: Usuário autenticado que deseja agendar um serviço
- **Barber**: Profissional da barbearia que realiza os serviços
- **Appointment**: Registro de um agendamento contendo serviço, data, horário e status
- **Time_Slot**: Intervalo de tempo disponível para agendamento (30 minutos)
- **Service**: Tipo de serviço oferecido pela barbearia (corte, barba, etc.)
- **Notification**: Alerta enviado ao cliente ou barbeiro sobre eventos do agendamento
- **Working_Hours**: Horários de funcionamento configurados para cada barbeiro

## Requirements

### Requirement 1

**User Story:** As a client, I want to book an appointment by selecting a service, date, and time slot, so that I can schedule my visit to the barbershop.

#### Acceptance Criteria

1. WHEN a client selects a service from the available list THEN the Booking_System SHALL display available dates for the next 30 days
2. WHEN a client selects a date THEN the Booking_System SHALL display only available time slots for that date
3. WHEN a client confirms a booking with valid service, date, and time THEN the Booking_System SHALL create an Appointment with status "confirmed"
4. WHEN a client attempts to book an already occupied time slot THEN the Booking_System SHALL reject the booking and display an error message
5. WHEN an Appointment is created THEN the Booking_System SHALL persist the Appointment to the database immediately

### Requirement 2

**User Story:** As a client, I want to view and cancel my appointments, so that I can manage my schedule.

#### Acceptance Criteria

1. WHEN a client accesses their appointments page THEN the Booking_System SHALL display all future appointments ordered by date
2. WHEN a client requests to cancel an appointment at least 2 hours before the scheduled time THEN the Booking_System SHALL update the Appointment status to "cancelled_by_client"
3. WHEN a client attempts to cancel an appointment less than 2 hours before the scheduled time THEN the Booking_System SHALL reject the cancellation and display a warning message
4. WHEN an Appointment is cancelled THEN the Booking_System SHALL make the time slot available for other bookings

### Requirement 3

**User Story:** As a barber, I want to view my daily and weekly schedule, so that I can prepare for my appointments.

#### Acceptance Criteria

1. WHEN a barber accesses the dashboard THEN the Booking_System SHALL display today's appointments in chronological order
2. WHEN a barber selects a specific date THEN the Booking_System SHALL display all appointments for that date
3. WHEN a barber views the weekly schedule THEN the Booking_System SHALL display appointments grouped by day for the current week
4. WHEN displaying an appointment THEN the Booking_System SHALL show client name, service type, time, and appointment status

### Requirement 4

**User Story:** As a barber, I want to cancel appointments when necessary, so that I can manage unexpected situations.

#### Acceptance Criteria

1. WHEN a barber cancels an appointment THEN the Booking_System SHALL update the Appointment status to "cancelled_by_barber"
2. WHEN a barber cancels an appointment THEN the Booking_System SHALL require a cancellation reason
3. WHEN an Appointment is cancelled by barber THEN the Booking_System SHALL make the time slot available for rebooking

### Requirement 5

**User Story:** As a client or barber, I want to receive notifications about appointment events, so that I stay informed about changes.

#### Acceptance Criteria

1. WHEN an Appointment is created THEN the Booking_System SHALL send a confirmation notification to the client
2. WHEN an Appointment is cancelled by the barber THEN the Booking_System SHALL send a notification to the client with the cancellation reason
3. WHEN an Appointment is cancelled by the client THEN the Booking_System SHALL send a notification to the barber
4. WHEN an Appointment is 24 hours away THEN the Booking_System SHALL send a reminder notification to the client
5. WHEN displaying notifications THEN the Booking_System SHALL show notification type, message, and timestamp

### Requirement 6

**User Story:** As a system administrator, I want to configure barber working hours and available services, so that the booking system reflects accurate availability.

#### Acceptance Criteria

1. WHEN configuring working hours THEN the Booking_System SHALL allow setting start time, end time, and break periods for each day
2. WHEN a time slot falls outside working hours THEN the Booking_System SHALL mark it as unavailable
3. WHEN a service is associated with a barber THEN the Booking_System SHALL only show that service for bookings with that barber
4. WHEN storing configuration data THEN the Booking_System SHALL persist changes to the database immediately

### Requirement 7

**User Story:** As a developer, I want appointment data to be serialized and deserialized correctly, so that data integrity is maintained across the system.

#### Acceptance Criteria

1. WHEN storing an Appointment THEN the Booking_System SHALL serialize the data to JSON format
2. WHEN retrieving an Appointment THEN the Booking_System SHALL deserialize the JSON data to the correct data structure
3. WHEN serializing and deserializing an Appointment THEN the Booking_System SHALL preserve all field values exactly
