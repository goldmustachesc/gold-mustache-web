# Product Overview

Gold Mustache is a web product for a barbershop business. It combines public brand presence, customer self-service, and operational tooling for barbers and administrators in a single experience.

## Core Capabilities

- Public-facing discovery of the barbershop, services, brand, and content
- Appointment-related journeys for customers, including self-service and guest-friendly flows
- Operational dashboards for barbers and admins to manage schedules, clients, services, settings, and business routines
- Loyalty and retention features such as points, rewards, referrals, expirations, and related notifications
- Account, profile, consent, and protected-area experiences for authenticated users

## Target Use Cases

- Visitors learn about the business, evaluate services, and convert into bookings
- Customers manage appointments, profile data, and post-booking interactions
- Barbers operate daily schedules, absences, client context, feedback, and financial visibility
- Admin users configure the business, staff, loyalty rules, feature flags, and operational settings

## Product Characteristics

- The product is brownfield: most new work extends existing flows rather than creating isolated new subsystems
- Brand consistency matters in both public and private areas, with mandatory light/dark support
- Operational clarity is important: many features exist to reduce manual follow-up for staff and improve context around customer actions
- The codebase already contains multiple mature domains, so feature work should respect established boundaries before adding new layers

## Value Proposition

- Unifies customer-facing and back-office barbershop workflows in one application
- Keeps business rules close to the Gold Mustache domain instead of relying on generic service-booking abstractions
- Supports ongoing growth through typed contracts, reusable services, and spec-driven delivery

---
_Focus on stable product purpose and recurring business domains, not a catalog of every page or feature._
