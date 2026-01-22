# DPM - Dental Practice Management

## Complete Documentation | [Documentacao em Portugues](./README.pt-BR.md)

---

# DPM - Dental Practice Management System

**Version:** 1.0.0
**Architecture:** Multi-tenant SaaS
**License:** Proprietary

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Features](#4-features)
5. [Modules](#5-modules)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Frontend Pages](#8-frontend-pages)
9. [Integrations](#9-integrations)
10. [Security](#10-security)
11. [Installation](#11-installation)
12. [Configuration](#12-configuration)
13. [Deployment](#13-deployment)

---

## 1. Overview

DPM (Dental Practice Management) is a complete, cloud-based SaaS platform designed specifically for dental clinics. It provides a comprehensive solution for managing all aspects of a dental practice, from patient scheduling and clinical records to financial management and marketing campaigns.

### Key Highlights

- **Multi-tenant Architecture**: Complete data isolation between clinics
- **Full-featured EHR**: Electronic health records with odontogram support
- **Smart Scheduling**: Conflict detection and availability management
- **Financial Control**: Payments, commissions, and detailed reporting
- **Patient Engagement**: NPS surveys, campaigns, and automated reminders
- **Compliance Management**: Document tracking with expiration alerts
- **Modern Tech Stack**: TypeScript, Vue 3, Fastify, PostgreSQL

### Target Users

- **Clinic Administrators**: Full system management
- **Dentists**: Patient care and clinical documentation
- **Receptionists**: Scheduling and patient communication
- **Financial Staff**: Payment processing and reporting

---

## 2. Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime environment |
| TypeScript | 5.3.0 | Type-safe development |
| Fastify | 4.26.0 | Web framework |
| Prisma | 5.9.0 | ORM / Database toolkit |
| PostgreSQL | 15.x | Primary database |
| Redis | 7.x | Cache and sessions |
| BullMQ | 5.1.0 | Job queue processing |
| Stripe | 20.1.2 | Payment processing |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue 3 | 3.4.0 | UI framework |
| Vite | 5.0.0 | Build tool |
| TailwindCSS | 3.4.0 | Styling |
| Pinia | 2.1.0 | State management |
| Vue Router | 4.2.0 | Routing |
| vue-i18n | 9.9.0 | Internationalization |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| MinIO | S3-compatible file storage |
| MailHog | Development email server |
| Turbo | Monorepo build system |

---

## 3. Project Structure

```
dpm-v0/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules (21)
│   │   │   ├── common/         # Shared utilities
│   │   │   ├── integrations/   # External services
│   │   │   └── index.ts        # Entry point
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema
│   │       └── seed.ts         # Database seeding
│   │
│   └── web/                    # Frontend SPA
│       ├── src/
│       │   ├── modules/        # Page components
│       │   ├── components/     # Reusable components
│       │   ├── stores/         # Pinia stores
│       │   ├── composables/    # Vue composables
│       │   └── i18n/           # Translations
│       └── index.html
│
├── packages/
│   └── shared/                 # Shared types
│
├── docker/                     # Docker configs
│   ├── docker-compose.dev.yml
│   └── docker-compose.yml
│
└── docs/                       # Documentation
```

---

## 4. Features

### 4.1 Patient Management

- **Complete Profiles**: Personal data, contact info, medical history
- **Medical Anamnesis**: Allergies, medications, conditions, habits
- **Patient Tagging**: Custom tags for segmentation
- **Communication Preferences**: Opt-in for WhatsApp, SMS, email
- **Guardian Information**: Support for minor patients
- **Search & Filters**: Find patients by name, CPF, phone, email

### 4.2 Appointment Scheduling

- **Calendar Views**: Day, week, and month views
- **Conflict Detection**: Automatic check for professional and room availability
- **Appointment Types**: Evaluation, treatment, return, emergency, maintenance
- **Status Workflow**: Scheduled → Confirmed → Waiting → In Progress → Completed
- **Recurring Appointments**: Schedule repeating appointments
- **Available Slots**: Calculate open time slots
- **Financial Overlay**: View appointment revenue projections

### 4.3 Electronic Health Records (EHR)

#### Odontogram
- Interactive dental chart (adult and pediatric)
- Tooth-by-tooth condition tracking
- Visual markers for procedures and conditions
- Complete change history with audit trail

#### Clinical Notes
- Appointment documentation
- Finalization workflow
- Professional attribution

#### Treatment Plans
- Multi-step treatment planning
- Item prioritization
- Progress tracking
- Cost estimation

#### Patient Images
- X-rays, panoramic, CT scans, photos
- Image annotations
- Before/after comparisons
- Cloud storage with MinIO/S3

### 4.4 Financial Management

#### Payments
- Multiple payment methods (cash, card, PIX, check, insurance)
- Installment support
- Payment status tracking
- Partial payments

#### Transactions
- Income and expense tracking
- Category classification
- Receipt/invoice linking

#### Reports
- Cash flow analysis
- Accounts receivable aging
- Professional commissions
- Revenue by procedure
- Revenue by professional
- Profit & Loss statements

### 4.5 Communication System

#### Message Templates
- Customizable templates for all message types
- Variable substitution (patient name, date, time, etc.)
- Multi-channel support (WhatsApp, SMS, email)

#### Automated Reminders
- Appointment reminders (configurable timing)
- Birthday messages
- Return reminders
- Treatment follow-ups

#### Delivery Tracking
- Message status monitoring
- Error handling and retry
- Delivery reports

### 4.6 Patient Satisfaction (NPS)

#### Surveys
- Multiple survey types (Initial, NPS, Periodic, Post-treatment)
- Question types: NPS scale, star rating, multiple choice, open text
- Automatic post-appointment sending

#### Analytics
- NPS score calculation
- Promoter/Passive/Detractor breakdown
- Trend analysis
- Alert system for low scores

### 4.7 Marketing Campaigns

#### Patient Segmentation
- Filter by demographics
- Filter by appointment history
- Filter by tags
- Preview segment before sending

#### Campaign Types
- Commemorative dates
- Birthday campaigns
- Reactivation campaigns
- Treatment follow-ups
- Promotional campaigns

#### Multi-channel Delivery
- WhatsApp messages
- SMS messages
- Email campaigns
- Delivery tracking and analytics

### 4.8 Document Management

#### Templates
- Prescriptions
- Medical certificates
- Exam requests
- Referrals
- Consent forms
- Custom templates

#### Features
- HTML/PDF support
- Header and footer customization
- Variable substitution
- Digital signatures
- Document history

### 4.9 Compliance Management

#### Document Tracking
- Licenses and permits
- Professional certificates
- Insurance policies
- Equipment certifications
- Facility documents

#### Alerts
- Expiration warnings
- Renewal reminders
- Status dashboard
- Professional document association

### 4.10 Help Center & Support

#### Knowledge Base
- Categorized articles
- Full-text search
- View tracking
- Getting started guides

#### Support Tickets
- Ticket creation and tracking
- Priority levels
- Status workflow
- Message threading

### 4.11 SaaS Features

#### Subscription Plans

| Plan | Price (BRL) | Users | Patients | Appointments |
|------|-------------|-------|----------|--------------|
| Free | R$ 0 | 1 | 50 | 100/month |
| Starter | R$ 99 | 3 | 300 | 500/month |
| Professional | R$ 199 | 10 | 1,000 | Unlimited |
| Enterprise | R$ 499 | Unlimited | Unlimited | Unlimited |

#### Features
- Trial period (14 days)
- Stripe payment integration
- Usage tracking and limits
- Plan upgrades/downgrades
- Invoice management

#### Super Admin Panel
- Clinic management
- Subscription oversight
- Trial extensions
- Platform analytics
- Revenue reports

---

## 5. Modules

### API Modules (21 total)

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/auth` | Authentication, 2FA, sessions |
| Patients | `/patients` | Patient CRUD and profiles |
| Appointments | `/appointments` | Scheduling and calendar |
| EHR | `/ehr` | Clinical records, odontogram |
| Messages | `/messages` | Templates and reminders |
| Financial | `/financial` | Payments and transactions |
| Surveys | `/surveys` | NPS and satisfaction |
| Campaigns | `/campaigns` | Marketing campaigns |
| Documents | `/documents` | Document generation |
| Images | `/images` | Patient image management |
| Compliance | `/compliance` | Regulatory documents |
| Help | `/help` | Knowledge base |
| Support | `/support` | Support tickets |
| Staff | `/staff` | Professional management |
| Clinic | `/clinic` | Clinic settings |
| Dashboard | `/dashboard` | Statistics and KPIs |
| Onboarding | `/onboarding` | Setup wizard |
| Reports | `/reports` | Export and analytics |
| Subscription | `/subscription` | Billing management |
| Admin | `/admin` | Super admin functions |
| Public | `/public` | Public endpoints |

---

## 6. Database Schema

### Core Models

```
Clinic              - Tenant organization
User                - System users
Professional        - Dental professionals
Patient             - Patient records
Room                - Treatment rooms
Procedure           - Dental procedures
```

### Appointment Models

```
Appointment         - Scheduled appointments
```

### Clinical Models

```
Treatment           - Individual treatments
TreatmentPlan       - Treatment plans
TreatmentPlanItem   - Plan items
ClinicalNote        - Appointment notes
Odontogram          - Dental charts
OdontogramHistory   - Chart change history
PatientImage        - Clinical images
```

### Communication Models

```
MessageTemplate     - Message templates
Reminder            - Scheduled reminders
MessageLog          - Delivery tracking
ReminderSettings    - Clinic preferences
```

### Financial Models

```
Payment             - Patient payments
Transaction         - Income/expenses
```

### Survey Models

```
Survey              - Survey definitions
SurveyQuestion      - Survey questions
SurveyResponse      - Patient responses
SurveyResponseAnswer - Individual answers
SurveyAlert         - Low score alerts
```

### Campaign Models

```
Segment             - Patient segments
Campaign            - Marketing campaigns
```

### Document Models

```
DocumentTemplate    - Document templates
PatientDocument     - Generated documents
ComplianceDocument  - Regulatory documents
```

### Support Models

```
HelpArticle         - Knowledge base
SupportTicket       - Support tickets
TicketMessage       - Ticket messages
```

### SaaS Models

```
SubscriptionPlan    - Pricing tiers
Subscription        - Clinic subscriptions
Invoice             - Billing invoices
UsageRecord         - Usage tracking
SuperAdmin          - Platform admins
```

---

## 7. API Reference

### Authentication

```
POST   /auth/login              # User login
POST   /auth/register           # Create user
POST   /auth/refresh            # Refresh token
POST   /auth/forgot-password    # Request reset
POST   /auth/reset-password     # Reset password
POST   /auth/2fa/enable         # Enable 2FA
POST   /auth/2fa/verify         # Verify 2FA code
POST   /auth/2fa/disable        # Disable 2FA
GET    /auth/me                 # Current user
POST   /auth/change-password    # Change password
GET    /auth/sessions           # List sessions
DELETE /auth/sessions/:id       # Revoke session
```

### Patients

```
GET    /patients                # List patients
GET    /patients/:id            # Get patient
POST   /patients                # Create patient
PUT    /patients/:id            # Update patient
DELETE /patients/:id            # Delete patient
GET    /patients/:id/appointments # Patient history
PUT    /patients/:id/anamnesis  # Update anamnesis
```

### Appointments

```
GET    /appointments            # List appointments
GET    /appointments/:id        # Get appointment
POST   /appointments            # Create appointment
PUT    /appointments/:id        # Update appointment
POST   /appointments/:id/status # Change status
GET    /appointments/available-slots # Find slots
GET    /appointments/financial-summary # Financial data
```

### Financial

```
GET    /financial/payments      # List payments
POST   /financial/payments      # Create payment
POST   /financial/payments/:id/pay # Record payment
GET    /financial/transactions  # List transactions
POST   /financial/transactions  # Create transaction
GET    /financial/summary       # Financial summary
GET    /financial/cash-flow     # Cash flow report
GET    /financial/commissions   # Commission report
```

---

## 8. Frontend Pages

### Public Pages
- Landing Page (`/landing`)
- Registration (`/register`)
- Login (`/login`)
- Password Recovery (`/forgot-password`)

### Dashboard
- Main Dashboard (`/`)

### Patient Management
- Patient List (`/patients`)
- Patient Details (`/patients/:id`)

### Scheduling
- Calendar View (`/schedule`)

### Financial
- Financial Dashboard (`/financial`)

### Settings
- Clinic Settings (`/settings`)
- Subscription Management (`/settings/subscription`)

### Other Modules
- Satisfaction Surveys (`/satisfaction`)
- Marketing Campaigns (`/campaigns`)
- Compliance (`/compliance`)
- Reports (`/reports`)
- Help Center (`/help`)

### Admin Panel
- Admin Login (`/admin/login`)
- Admin Dashboard (`/admin`)
- Clinic Management (`/admin/clinics`)

---

## 9. Integrations

### Stripe (Payment Processing)
- Subscription billing
- Checkout sessions
- Customer portal
- Webhook handling
- Invoice management

### WhatsApp Business API
- Text message sending
- Template messages
- Delivery status tracking
- Via Evolution API

### ElevenLabs (Text-to-Speech)
- Audio message generation
- Voice reminders
- Brazilian Portuguese support

### MinIO/S3 (File Storage)
- Patient images
- Document storage
- Compliance documents
- Secure file access

### SMTP (Email)
- Transactional emails
- Password reset
- Appointment reminders
- Campaign delivery

---

## 10. Security

### Authentication
- JWT-based authentication
- Access and refresh tokens
- Token rotation
- Session management

### Two-Factor Authentication
- TOTP-based 2FA
- QR code setup
- Backup codes

### Password Security
- bcrypt hashing (12 rounds)
- Password strength requirements
- Account lockout protection

### Authorization
- Role-based access control (RBAC)
- 5 user roles: Admin, Dentist, Receptionist, Assistant, Financial
- Permission enforcement

### API Security
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation (Zod)

### Data Protection
- Multi-tenant isolation
- Audit logging
- LGPD compliance ready

---

## 11. Installation

### Prerequisites

- Node.js 20.x
- pnpm 9.x
- Docker and Docker Compose
- PostgreSQL 15.x (or use Docker)
- Redis 7.x (or use Docker)

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd dpm-v0

# Install dependencies
pnpm install

# Start infrastructure (Docker)
docker compose -f docker/docker-compose.dev.yml up -d

# Run database migrations
pnpm --filter @dpm/api db:push

# Seed database
pnpm --filter @dpm/api db:seed

# Start development servers
pnpm dev
```

### Access Points

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Prisma Studio: http://localhost:5555
- MailHog: http://localhost:8025
- MinIO Console: http://localhost:9001

### Demo Credentials

**Clinic User:**
- Email: `admin@demo.dpm.local`
- Password: `Admin@123`

**Super Admin:**
- Email: `admin@dpm.app`
- Password: `SuperAdmin@123`
- URL: `/admin/login`

---

## 12. Configuration

### Environment Variables

Create a `.env` file in `apps/api/`:

```env
# Application
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dpm

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Storage (MinIO)
STORAGE_ENDPOINT=localhost
STORAGE_PORT=9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=dpm
STORAGE_USE_SSL=false

# Email (SMTP)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@dpm.local

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# WhatsApp (Evolution API)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=your-api-key
WHATSAPP_INSTANCE_NAME=dpm

# ElevenLabs
ELEVENLABS_API_KEY=your-api-key
ELEVENLABS_VOICE_ID=voice-id
```

---

## 13. Deployment

### Production Requirements

- PostgreSQL database (managed recommended)
- Redis instance
- S3-compatible storage
- SMTP service or email provider
- Stripe account
- SSL certificates
- Reverse proxy (nginx/Caddy)

### Docker Deployment

```bash
# Build production images
docker compose -f docker/docker-compose.yml build

# Start services
docker compose -f docker/docker-compose.yml up -d

# Run migrations
docker compose exec api npx prisma migrate deploy

# Seed initial data
docker compose exec api npx prisma db seed
```

### Health Checks

- API: `GET /health`
- Database: Connection pool monitoring
- Redis: Connection status
- Storage: Bucket accessibility

---

## Support

For questions, issues, or feature requests, please contact the development team or create a support ticket within the application.

---

**DPM - Dental Practice Management**
*Transforming dental practice management*
