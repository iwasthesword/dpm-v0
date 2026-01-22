# Functional Specification Document (FSD)
## Dental Practice Management SaaS Platform

**Version:** 1.0  
**Date:** January 2026  
**Author:** N7 Digital  
**Status:** Draft  
**Classification:** Internal

---

# Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Module Specifications](#4-module-specifications)
   - 4.1 [Authentication Module](#41-authentication-module)
   - 4.2 [Clinic Management Module (Multi-tenant)](#42-clinic-management-module-multi-tenant)
   - 4.3 [Patient Management Module](#43-patient-management-module)
   - 4.4 [Appointment Scheduling Module](#44-appointment-scheduling-module)
   - 4.5 [Electronic Health Records Module](#45-electronic-health-records-module)
   - 4.6 [Reminders and Communication Module](#46-reminders-and-communication-module)
   - 4.7 [Clinical Documents Module](#47-clinical-documents-module)
   - 4.8 [Marketing Campaigns Module](#48-marketing-campaigns-module)
   - 4.9 [Patient Satisfaction Module](#49-patient-satisfaction-module)
   - 4.10 [Staff Management Module](#410-staff-management-module)
   - 4.11 [Financial Module](#411-financial-module)
   - 4.12 [Regulatory Documentation Module](#412-regulatory-documentation-module)
   - 4.13 [Reports and Dashboard Module](#413-reports-and-dashboard-module)
   - 4.14 [Help Center Module](#414-help-center-module)
5. [External Integrations](#5-external-integrations)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Data Dictionary](#7-data-dictionary)
8. [Appendices](#8-appendices)

---

# 1. Introduction

## 1.1 Purpose

This Functional Specification Document (FSD) provides a comprehensive description of the functional requirements, business rules, user flows, and system behaviors for the Dental Practice Management SaaS Platform. It serves as the primary reference for development, testing, and stakeholder alignment.

## 1.2 Scope

The system is a cloud-based, multi-tenant SaaS platform designed specifically for dental clinics and practices, providing:

- Patient management and electronic health records
- Appointment scheduling and calendar management
- Automated communication via WhatsApp (text and AI-generated voice)
- Clinical document generation (prescriptions, certificates, exam requests)
- Segmented marketing campaigns
- Patient satisfaction surveys (NPS)
- Financial management and professional fee splitting
- Staff management with role-based access control
- Regulatory documentation tracking
- Comprehensive reporting and analytics

## 1.3 Target Audience

This document is intended for:
- Software developers and engineers
- QA engineers and testers
- Product managers
- UX/UI designers
- Technical stakeholders
- Project managers

## 1.4 Definitions and Acronyms

| Term | Definition |
|------|------------|
| Tenant | Individual clinic/practice within the multi-tenant system |
| CRO | Regional Council of Dentistry (Brazilian regulatory body) |
| NPS | Net Promoter Score - customer satisfaction metric |
| TTS | Text-to-Speech - audio generation from text |
| Evolution API | WhatsApp Business API integration solution |
| Odontogram | Visual diagram representing patient's teeth |
| LGPD | Brazilian General Data Protection Law |
| EHR | Electronic Health Record |
| SaaS | Software as a Service |

## 1.5 Document Conventions

- **[FR-XXX]** - Functional Requirement
- **[BR-XXX]** - Business Rule
- **[US-XXX]** - User Story
- **[VAL-XXX]** - Validation Rule
- **[UI-XXX]** - User Interface Requirement
- **[INT-XXX]** - Integration Requirement

---

# 2. System Overview

## 2.1 System Context Diagram

```
                                    ┌─────────────────┐
                                    │   Dental Staff  │
                                    │  (Dentists,     │
                                    │   Assistants,   │
                                    │   Receptionists)│
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────┐                   ┌─────────────────────┐                   ┌─────────────┐
│  WhatsApp   │◄─────────────────►│                     │◄─────────────────►│  Patients   │
│  (Evolution │                   │   DENTAL PRACTICE   │                   │  (Web/      │
│   API)      │                   │   MANAGEMENT SAAS   │                   │   Mobile)   │
└─────────────┘                   │                     │                   └─────────────┘
                                  └──────────┬──────────┘
┌─────────────┐                              │                              ┌─────────────┐
│  ElevenLabs │◄─────────────────────────────┼─────────────────────────────►│  Payment    │
│  (TTS)      │                              │                              │  Gateway    │
└─────────────┘                              │                              └─────────────┘
                                             │
┌─────────────┐                              │                              ┌─────────────┐
│  Email      │◄─────────────────────────────┴─────────────────────────────►│  Cloud      │
│  Service    │                                                             │  Storage    │
└─────────────┘                                                             └─────────────┘
```

## 2.2 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Dashboard │ │ Calendar │ │ Patients │ │ Finance  │ │ Reports  │  ...    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                         Vue 3 + Tailwind CSS                               │
└────────────────────────────────────────────────────────────────────────────┘
                                    │ REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            BUSINESS LAYER                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │  Appointment    │ │    Patient      │ │   Messaging     │               │
│  │    Service      │ │    Service      │ │    Service      │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │   Financial     │ │    Campaign     │ │    Document     │               │
│  │    Service      │ │    Service      │ │    Service      │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                        Fastify + Node.js                                   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  PostgreSQL  │  │    Redis     │  │  S3 Storage  │  │   BullMQ     │   │
│  │   (Prisma)   │  │   (Cache)    │  │   (Files)    │  │   (Queues)   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Multi-Tenant Architecture

The system implements a shared database with tenant isolation using `clinic_id` in all tables.

**[BR-001]** Each tenant (clinic) has completely isolated data.

**[BR-002]** Users can only access data from clinics they are authorized to view.

**[BR-003]** Each clinic has a unique subdomain: `{clinic-slug}.app.domain.com`

---

# 3. User Roles and Permissions

## 3.1 Role Definitions

### 3.1.1 Administrator (ADMIN)

**Description:** Full system access for clinic owners or managers.

**Permissions:**
- Full CRUD on all modules
- User and role management
- System configuration
- Financial reports and data
- Integration settings (WhatsApp, etc.)

### 3.1.2 Dentist (DENTIST)

**Description:** Dental professionals providing patient care.

**Permissions:**
- View own schedule and appointments
- Full access to patient records (own patients or shared)
- Create prescriptions, certificates, documents
- View own financial performance
- Cannot access clinic-wide financial data or settings

### 3.1.3 Receptionist (RECEPTIONIST)

**Description:** Front desk staff managing appointments and patient intake.

**Permissions:**
- Full access to scheduling
- Patient registration and basic data
- Limited medical record access (demographics only)
- Partial financial access (payments, receipts)
- Cannot access clinical notes or diagnosis

### 3.1.4 Dental Assistant (ASSISTANT)

**Description:** Clinical support staff.

**Permissions:**
- View schedule (read-only)
- Limited patient record access
- Cannot create or edit clinical documents
- No financial access

### 3.1.5 Financial (FINANCIAL)

**Description:** Accounting and financial staff.

**Permissions:**
- Full financial module access
- Reports and analytics
- No clinical data access
- No scheduling access

## 3.2 Permission Matrix

| Module | Admin | Dentist | Receptionist | Assistant | Financial |
|--------|-------|---------|--------------|-----------|-----------|
| Dashboard | Full | Own | Limited | Limited | Financial |
| Schedule | Full | Own | Full | View | None |
| Patients | Full | Own | Basic | View | None |
| Medical Records | Full | Own | None | View | None |
| Documents | Full | Own | View | None | None |
| Finance | Full | Own | Partial | None | Full |
| Reports | Full | Own | Limited | None | Full |
| Settings | Full | None | None | None | None |
| Staff | Full | None | None | None | None |
| Campaigns | Full | None | Execute | None | None |
| Integrations | Full | None | None | None | None |

## 3.3 User Stories - Roles

**[US-001]** As an administrator, I want to create user accounts with specific roles so that staff members have appropriate access levels.

**[US-002]** As a dentist, I want to access only my patients' records so that I can focus on my workload while maintaining privacy.

**[US-003]** As a receptionist, I want to manage the entire schedule so that I can efficiently book and reschedule appointments for all dentists.

---

# 4. Module Specifications

---

## 4.1 Authentication Module

### 4.1.1 Overview

Handles user authentication, session management, and security features.

### 4.1.2 Functional Requirements

**[FR-AUTH-001] User Login**
- System shall allow users to authenticate using email and password
- Login form shall include email field, password field, and "Remember me" checkbox
- System shall validate credentials against stored hash (bcrypt)
- Upon successful login, system shall generate JWT access token (15 min) and refresh token (7 days)

**[FR-AUTH-002] Two-Factor Authentication (2FA)**
- System shall support optional 2FA via authenticator app (TOTP)
- Users can enable/disable 2FA in profile settings
- When enabled, login requires 6-digit code after password verification

**[FR-AUTH-003] Password Recovery**
- System shall provide "Forgot Password" functionality
- Recovery email shall contain unique, time-limited token (1 hour)
- Token can only be used once

**[FR-AUTH-004] Session Management**
- System shall automatically refresh access tokens before expiration
- System shall invalidate all sessions on password change
- System shall track active sessions per user

**[FR-AUTH-005] Account Lockout**
- System shall lock account after 5 failed login attempts
- Lockout duration: 15 minutes
- System shall notify user via email of lockout event

### 4.1.3 Business Rules

**[BR-AUTH-001]** Passwords must meet complexity requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**[BR-AUTH-002]** Sessions shall expire after 24 hours of inactivity.

**[BR-AUTH-003]** Password reset tokens are single-use and expire in 1 hour.

### 4.1.4 User Interface Requirements

**[UI-AUTH-001] Login Screen**
```
┌─────────────────────────────────────┐
│           [CLINIC LOGO]             │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email                         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Password                  👁️  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ☐ Remember me    Forgot password? │
│                                     │
│  ┌───────────────────────────────┐  │
│  │          Sign In              │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 4.1.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/2fa/enable` | Enable two-factor auth |
| POST | `/auth/2fa/verify` | Verify 2FA code |
| GET | `/auth/sessions` | List active sessions |
| DELETE | `/auth/sessions/:id` | Revoke specific session |

### 4.1.6 Validation Rules

**[VAL-AUTH-001]** Email must be valid format and exist in system.

**[VAL-AUTH-002]** Password field cannot be empty.

**[VAL-AUTH-003]** 2FA code must be exactly 6 digits.

---

## 4.2 Clinic Management Module (Multi-tenant)

### 4.2.1 Overview

Manages clinic/practice configuration, branding, and tenant-specific settings.

### 4.2.2 Functional Requirements

**[FR-CLINIC-001] Clinic Registration**
- System shall capture clinic business information during onboarding
- Required fields: name, CNPJ (tax ID), email, phone, address
- System shall generate unique subdomain based on clinic name

**[FR-CLINIC-002] Clinic Profile Management**
- Administrators can update clinic information
- System shall support logo upload (PNG, JPG, max 2MB)
- Logo appears on documents, emails, and patient portal

**[FR-CLINIC-003] Operating Hours**
- System shall allow configuration of operating hours per day of week
- Support for different hours per professional
- Support for lunch breaks and blocked periods

**[FR-CLINIC-004] Rooms/Chairs Management**
- System shall support multiple treatment rooms/dental chairs
- Each room can be assigned to specific procedures or professionals
- Rooms can be temporarily disabled (maintenance)

**[FR-CLINIC-005] Integration Settings**
- WhatsApp connection (Evolution API instance)
- Voice settings (ElevenLabs voice ID)
- Payment gateway configuration
- Email sender configuration

### 4.2.3 Data Model

```
Clinic {
  id: string (CUID)
  name: string
  tradeName: string?
  cnpj: string (unique)
  email: string
  phone: string
  address: {
    street: string
    number: string
    complement: string?
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  logo: string? (URL)
  subdomain: string (unique)
  timezone: string (default: "America/Sao_Paulo")
  settings: {
    operatingHours: OperatingHours[]
    appointmentDuration: number (default: 30)
    reminderSettings: ReminderSettings
    surveySettings: SurveySettings
  }
  whatsappConfig: {
    instanceName: string
    apiUrl: string
    apiKey: string (encrypted)
    webhookUrl: string
  }
  ttsConfig: {
    voiceId: string
    language: string
  }
  createdAt: datetime
  updatedAt: datetime
}
```

### 4.2.4 Business Rules

**[BR-CLINIC-001]** CNPJ must be valid and unique across all tenants.

**[BR-CLINIC-002]** Subdomain must be URL-safe (lowercase, no spaces, alphanumeric + hyphens).

**[BR-CLINIC-003]** Logo must be optimized/resized to max 500x500 pixels on upload.

**[BR-CLINIC-004]** WhatsApp API credentials must be encrypted at rest.

### 4.2.5 User Stories

**[US-CLINIC-001]** As a clinic owner, I want to register my clinic so that I can start using the system.

**[US-CLINIC-002]** As an administrator, I want to upload my clinic's logo so that all documents have consistent branding.

**[US-CLINIC-003]** As an administrator, I want to configure operating hours so that online scheduling respects my availability.

**[US-CLINIC-004]** As an administrator, I want to connect my WhatsApp number so that I can send automated messages.

---

## 4.3 Patient Management Module

### 4.3.1 Overview

Comprehensive patient data management including demographics, contact information, medical history, and consent management.

### 4.3.2 Functional Requirements

**[FR-PAT-001] Patient Registration**
- System shall capture complete patient demographics
- Required fields: full name, phone (WhatsApp)
- Optional fields: CPF, email, birth date, address, photo

**[FR-PAT-002] Guardian Information**
- For patients under 18, system shall require guardian information
- Guardian fields: name, CPF, relationship, contact

**[FR-PAT-003] Patient Search**
- System shall provide search by: name, CPF, phone, email
- Search shall support partial matching and phonetic similarity
- Results shall display patient photo thumbnail if available

**[FR-PAT-004] Patient Photo**
- System shall support profile photo upload
- Photo shall be automatically resized and optimized
- Photo appears in patient list, appointment view, and records

**[FR-PAT-005] Communication Preferences**
- System shall track opt-in status for: WhatsApp, SMS, Email
- Patients can update preferences via portal or staff update
- System shall respect preferences for all automated messages

**[FR-PAT-006] Patient Tags**
- System shall support custom tags for patient categorization
- Tags can be used for filtering and campaign segmentation
- Examples: "VIP", "Insurance", "Referred by Dr. X"

**[FR-PAT-007] Patient Merge**
- System shall detect potential duplicate records
- Administrators can merge duplicate patients
- Merge preserves all appointments, records, and history

**[FR-PAT-008] Data Export**
- Patients can request export of all their data (LGPD compliance)
- Export format: JSON or PDF report
- Request must be fulfilled within 15 days

### 4.3.3 Data Model

```
Patient {
  id: string (CUID)
  clinicId: string (FK)
  
  // Personal Information
  name: string
  cpf: string? (unique per clinic)
  birthDate: date?
  gender: enum (MALE, FEMALE, OTHER)?
  maritalStatus: string?
  occupation: string?
  photo: string? (URL)
  
  // Contact Information
  phone: string (primary, WhatsApp)
  phoneSecondary: string?
  email: string?
  address: {
    street: string?
    number: string?
    complement: string?
    neighborhood: string?
    city: string?
    state: string?
    zipCode: string?
  }
  
  // Guardian (for minors)
  guardian: {
    name: string
    cpf: string
    relationship: string
    phone: string
  }?
  
  // Medical History (Anamnesis)
  anamnesis: {
    allergies: string[]
    medications: string[]
    diseases: string[]
    surgeries: string[]
    isPregnant: boolean
    notes: string?
    lastUpdated: datetime
  }?
  
  // Communication Preferences
  whatsappOptIn: boolean (default: true)
  smsOptIn: boolean (default: true)
  emailOptIn: boolean (default: true)
  
  // Metadata
  source: string? (referral source)
  tags: string[]
  notes: string?
  
  isActive: boolean (default: true)
  createdAt: datetime
  updatedAt: datetime
}
```

### 4.3.4 Business Rules

**[BR-PAT-001]** Phone number is required and must be valid Brazilian format.

**[BR-PAT-002]** CPF, if provided, must pass validation algorithm.

**[BR-PAT-003]** For patients under 18 years old, guardian information is mandatory.

**[BR-PAT-004]** Patient records are never physically deleted; they are soft-deleted (marked inactive).

**[BR-PAT-005]** CPF must be unique within the same clinic (different clinics can have same patient).

### 4.3.5 User Interface Requirements

**[UI-PAT-001] Patient List Screen**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Patients                                        [+ New Patient]    │
├─────────────────────────────────────────────────────────────────────┤
│  🔍 Search patients...                     [Filters ▼] [Export]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────┬────────────────┬─────────────┬──────────┬────────────┐    │
│  │Photo│ Name           │ Phone       │ Last Visit│ Actions   │    │
│  ├─────┼────────────────┼─────────────┼──────────┼────────────┤    │
│  │ 👤  │ Maria Silva    │ (11) 99999  │ Jan 10   │ [👁️][✏️][📅]│    │
│  │ 👤  │ João Santos    │ (11) 98888  │ Jan 08   │ [👁️][✏️][📅]│    │
│  │ 👤  │ Ana Costa      │ (11) 97777  │ Dec 15   │ [👁️][✏️][📅]│    │
│  └─────┴────────────────┴─────────────┴──────────┴────────────┘    │
│                                                                     │
│  Showing 1-20 of 1,234 patients          [< Prev] [1] [2] [Next >] │
└─────────────────────────────────────────────────────────────────────┘
```

**[UI-PAT-002] Patient Profile Screen**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back                                    [Edit] [📅 Schedule]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  Maria da Silva                                      │
│  │          │  📱 (11) 99999-8888 (WhatsApp)                       │
│  │  [PHOTO] │  ✉️  maria@email.com                                 │
│  │          │  🎂 March 15, 1985 (39 years old)                    │
│  └──────────┘  📍 São Paulo, SP                                    │
│                Tags: [VIP] [Insurance]                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [Overview] [Records] [Appointments] [Images] [Documents] [Finance]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Quick Stats                                                        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐             │
│  │ 12 Visits     │ │ Last: Jan 10  │ │ R$ 3,450 spent│             │
│  └───────────────┘ └───────────────┘ └───────────────┘             │
│                                                                     │
│  Upcoming Appointments                                              │
│  • Jan 20, 2026 - 14:00 - Cleaning (Dr. João)                      │
│                                                                     │
│  Allergies & Alerts                                                 │
│  ⚠️ Penicillin allergy                                             │
│  ⚠️ Hypertension - on medication                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients` | List patients (paginated, filterable) |
| POST | `/patients` | Create new patient |
| GET | `/patients/:id` | Get patient details |
| PUT | `/patients/:id` | Update patient |
| DELETE | `/patients/:id` | Soft delete patient |
| GET | `/patients/:id/appointments` | Get patient appointments |
| GET | `/patients/:id/records` | Get patient medical records |
| GET | `/patients/:id/images` | Get patient images |
| POST | `/patients/:id/images` | Upload patient image |
| GET | `/patients/:id/documents` | Get patient documents |
| GET | `/patients/:id/financial` | Get patient financial history |
| POST | `/patients/search` | Advanced search |
| POST | `/patients/merge` | Merge duplicate patients |
| POST | `/patients/:id/export` | Request data export |

### 4.3.7 Validation Rules

**[VAL-PAT-001]** Name: required, 2-200 characters.

**[VAL-PAT-002]** Phone: required, valid Brazilian format (10-11 digits).

**[VAL-PAT-003]** CPF: optional, must pass mod-11 validation if provided.

**[VAL-PAT-004]** Email: optional, must be valid format if provided.

**[VAL-PAT-005]** Birth date: optional, cannot be future date.

**[VAL-PAT-006]** Photo: PNG/JPG/WEBP, max 5MB.

---

## 4.4 Appointment Scheduling Module

### 4.4.1 Overview

Full-featured appointment scheduling with support for multiple professionals, rooms, procedure types, and automated confirmations.

### 4.4.2 Functional Requirements

**[FR-APT-001] Calendar View**
- System shall display calendar in day, week, and month views
- Each professional shall have color-coded appointments
- Current time indicator on day/week views
- Quick view of appointment details on hover/click

**[FR-APT-002] Appointment Creation**
- System shall allow scheduling with: patient, professional, date/time, procedure, room
- System shall validate against operating hours
- System shall check for conflicts (professional, room, patient)
- System shall auto-calculate end time based on procedure duration

**[FR-APT-003] Appointment Types**
- Evaluation: Initial patient assessment
- Treatment: Regular procedure appointments
- Return: Follow-up visits
- Emergency: Urgent care slots
- Maintenance: Recurring preventive care

**[FR-APT-004] Appointment Status Workflow**
```
[Scheduled] → [Confirmed] → [Waiting] → [In Progress] → [Completed]
     │              │            │
     └──────────────┼────────────┴─────→ [Cancelled]
                    │
                    └──────────────────→ [No Show]
```

**[FR-APT-005] Drag-and-Drop Rescheduling**
- Users can drag appointments to new time slots
- System shall validate new time against constraints
- System shall prompt for confirmation before saving
- Optional: send reschedule notification to patient

**[FR-APT-006] Recurring Appointments**
- System shall support recurring appointments (weekly, bi-weekly, monthly)
- Maximum recurrence: 12 appointments
- Each occurrence can be individually modified or cancelled

**[FR-APT-007] Waitlist**
- System shall maintain waitlist for fully booked days
- When cancellation occurs, system can notify waitlist patients
- Priority queue based on signup time or urgency flag

**[FR-APT-008] Time Blocking**
- Professionals can block time for: lunch, meetings, personal time
- Blocked times prevent scheduling
- Support for recurring blocks (e.g., lunch every day)

**[FR-APT-009] Online Scheduling (Patient Portal)**
- Patients can view available slots
- Patients can request appointments (requires confirmation)
- Integration with clinic website via embed code or link

**[FR-APT-010] Appointment Confirmation**
- System shall send automatic confirmation requests via WhatsApp
- Patients can confirm by replying "YES" or "SIM"
- Staff can manually mark as confirmed
- Visual indicator of confirmation status on calendar

### 4.4.3 Data Model

```
Appointment {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  professionalId: string (FK)
  roomId: string? (FK)
  
  startTime: datetime
  endTime: datetime
  
  type: enum (EVALUATION, TREATMENT, RETURN, EMERGENCY, MAINTENANCE)
  status: enum (SCHEDULED, CONFIRMED, WAITING, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED)
  
  procedureId: string? (FK)
  notes: string?
  internalNotes: string? (staff only)
  
  // Confirmation tracking
  confirmedAt: datetime?
  confirmedVia: string? (whatsapp, phone, email, portal)
  
  // Recurrence
  recurrenceRule: string? (RRULE format)
  recurrenceParentId: string? (FK to parent appointment)
  
  // Cancellation
  cancelledAt: datetime?
  cancellationReason: string?
  cancelledBy: string? (FK to user)
  
  createdBy: string (FK to user)
  createdAt: datetime
  updatedAt: datetime
}

Room {
  id: string (CUID)
  clinicId: string (FK)
  name: string
  description: string?
  color: string
  isActive: boolean
  createdAt: datetime
}
```

### 4.4.4 Business Rules

**[BR-APT-001]** Appointments cannot be scheduled outside clinic operating hours.

**[BR-APT-002]** Appointments cannot overlap for the same professional.

**[BR-APT-003]** Appointments cannot overlap for the same room.

**[BR-APT-004]** Appointments cannot overlap for the same patient (with warning override).

**[BR-APT-005]** Minimum appointment duration: 15 minutes.

**[BR-APT-006]** Maximum appointment duration: 480 minutes (8 hours).

**[BR-APT-007]** Appointments can only be modified until 24 hours before start time (configurable).

**[BR-APT-008]** No-show status can only be set after appointment start time has passed.

**[BR-APT-009]** Completed appointments cannot be modified, only notes can be added.

### 4.4.5 User Interface Requirements

**[UI-APT-001] Calendar View (Week)**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Schedule                     ◀ Jan 13-19, 2026 ▶  [Day][Week][Month]│
├─────────────────────────────────────────────────────────────────────┤
│  [+ New Appointment]  [🔍 Find slot]  Professional: [All ▼]         │
├───────┬────────┬────────┬────────┬────────┬────────┬────────┬──────┤
│ Time  │  Mon   │  Tue   │  Wed   │  Thu   │  Fri   │  Sat   │ Sun  │
│       │  13    │  14    │  15    │  16    │  17    │  18    │  19  │
├───────┼────────┼────────┼────────┼────────┼────────┼────────┼──────┤
│ 08:00 │        │ ▓▓▓▓▓▓ │        │ ▓▓▓▓▓▓ │        │        │      │
│       │        │ Maria  │        │ João   │        │        │      │
├───────┼────────┼────────┼────────┼────────┼────────┼────────┼──────┤
│ 09:00 │ ▓▓▓▓▓▓ │ ▓▓▓▓▓▓ │        │        │ ▓▓▓▓▓▓ │        │      │
│       │ Pedro  │ Maria  │        │        │ Ana    │        │      │
├───────┼────────┼────────┼────────┼────────┼────────┼────────┼──────┤
│ 10:00 │        │        │ ▓▓▓▓▓▓ │ ▓▓▓▓▓▓ │        │ ▓▓▓▓▓▓ │      │
│       │        │        │ Carlos │ Paulo  │        │ Lucia  │      │
├───────┼────────┼────────┼────────┼────────┼────────┼────────┼──────┤
│  ...  │        │        │        │        │        │        │      │
└───────┴────────┴────────┴────────┴────────┴────────┴────────┴──────┘

Legend: ▓ Evaluation  ▓ Treatment  ▓ Return  ▓ Blocked
```

**[UI-APT-002] Appointment Details Modal**
```
┌─────────────────────────────────────────────┐
│  Appointment Details                    [X] │
├─────────────────────────────────────────────┤
│                                             │
│  Patient: Maria da Silva                    │
│  📱 (11) 99999-8888    [💬 WhatsApp]       │
│                                             │
│  Date: January 14, 2026                     │
│  Time: 08:00 - 09:00                        │
│  Professional: Dr. João Silva               │
│  Room: Room 1                               │
│  Procedure: Dental Cleaning                 │
│                                             │
│  Status: [Scheduled ▼]                      │
│  ✅ Confirmed via WhatsApp (Jan 13, 15:30) │
│                                             │
│  Notes:                                     │
│  ┌─────────────────────────────────────────┐│
│  │ Patient requested early morning slot    ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Start Appointment] [Reschedule] [Cancel]  │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.4.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments` | List appointments (filtered by date range) |
| POST | `/appointments` | Create appointment |
| GET | `/appointments/:id` | Get appointment details |
| PUT | `/appointments/:id` | Update appointment |
| DELETE | `/appointments/:id` | Cancel appointment |
| POST | `/appointments/:id/confirm` | Mark as confirmed |
| POST | `/appointments/:id/checkin` | Mark as waiting |
| POST | `/appointments/:id/start` | Start appointment |
| POST | `/appointments/:id/complete` | Complete appointment |
| POST | `/appointments/:id/noshow` | Mark as no-show |
| GET | `/appointments/available-slots` | Find available time slots |
| GET | `/appointments/waitlist` | Get waitlist |
| POST | `/appointments/waitlist` | Add to waitlist |
| GET | `/rooms` | List rooms |
| POST | `/rooms` | Create room |

### 4.4.7 Validation Rules

**[VAL-APT-001]** Patient ID: required, must exist.

**[VAL-APT-002]** Professional ID: required, must exist and be active.

**[VAL-APT-003]** Start time: required, must be in future for new appointments.

**[VAL-APT-004]** End time: required, must be after start time.

**[VAL-APT-005]** Procedure: optional, but recommended for duration calculation.

---

## 4.5 Electronic Health Records Module

### 4.5.1 Overview

Comprehensive electronic health records with dental-specific features including odontogram, treatment plans, clinical notes, and image management.

### 4.5.2 Functional Requirements

**[FR-EHR-001] Anamnesis (Medical History)**
- System shall capture comprehensive medical history
- Categories: allergies, current medications, chronic diseases, surgical history
- Support for custom questions per clinic
- Alert system for critical conditions (allergies, anticoagulants, etc.)

**[FR-EHR-002] Odontogram (Dental Chart)**
- Visual representation of all teeth (adult and child variants)
- Support for FDI notation (international standard)
- Click-to-select teeth for procedures
- Visual status indicators: healthy, caries, restoration, extraction, implant
- Historical view of tooth status changes

**[FR-EHR-003] Treatment Plans**
- System shall support multiple treatment plans per patient
- Each plan contains: procedures, teeth involved, estimated cost, priority
- Plan status: draft, presented, approved, in progress, completed
- Digital approval/signature by patient
- Progress tracking with completion percentage

**[FR-EHR-004] Clinical Notes**
- System shall record clinical notes per appointment/visit
- Support for templates per procedure type
- Rich text formatting
- Auto-save during editing
- Cannot be modified after appointment is completed (append-only)

**[FR-EHR-005] Image Gallery**
- Categories: intraoral photos, extraoral photos, X-rays, panoramic, CT scans
- Support for DICOM images (X-ray integration)
- Before/after comparison feature with side-by-side view
- Annotation tools (draw, text, measurements)
- Automatic watermark with clinic logo (configurable)

**[FR-EHR-006] Image Comparison Tool**
- Side-by-side or overlay comparison modes
- Slider to reveal before/after
- Date stamps on images
- Export comparison as single image for patient

**[FR-EHR-007] Record Sharing**
- Share records with other professionals in same clinic
- Share options: all records, specific date range, specific categories
- Audit log of all access and shares
- External sharing via secure link (time-limited)

**[FR-EHR-008] Record Printing**
- Print patient summary
- Print treatment plan
- Print clinical history
- Include clinic branding

### 4.5.3 Data Model

```
Treatment {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  professionalId: string (FK)
  appointmentId: string? (FK)
  
  procedureId: string (FK)
  tooth: string? (FDI notation: "11", "48", etc.)
  quadrant: string? ("upper-right", "lower-left", etc.)
  surface: string? (for restorations: "MOD", "OL", etc.)
  
  notes: string?
  status: enum (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
  
  completedAt: datetime?
  createdAt: datetime
  updatedAt: datetime
}

TreatmentPlan {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  professionalId: string (FK)
  
  name: string
  description: string?
  
  items: TreatmentPlanItem[]
  
  totalCost: decimal
  status: enum (DRAFT, PRESENTED, APPROVED, IN_PROGRESS, COMPLETED, REJECTED)
  
  presentedAt: datetime?
  approvedAt: datetime?
  approvalSignature: string? (URL to signature image)
  
  validUntil: date?
  
  createdAt: datetime
  updatedAt: datetime
}

TreatmentPlanItem {
  id: string (CUID)
  planId: string (FK)
  procedureId: string (FK)
  tooth: string?
  quantity: number (default: 1)
  unitPrice: decimal
  totalPrice: decimal
  priority: number
  notes: string?
  status: enum (PENDING, IN_PROGRESS, COMPLETED)
}

PatientImage {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  treatmentId: string? (FK)
  
  type: enum (PHOTO, XRAY, PANORAMIC, CT, DOCUMENT, OTHER)
  category: string (frontal, lateral, intraoral, occlusal, etc.)
  
  url: string (S3 URL)
  thumbnailUrl: string?
  
  beforeAfter: enum (BEFORE, AFTER)?
  tooth: string?
  
  annotations: JSON? (drawing/text annotations)
  notes: string?
  
  takenAt: datetime
  uploadedBy: string (FK to user)
  createdAt: datetime
}

ClinicalNote {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  appointmentId: string? (FK)
  professionalId: string (FK)
  
  content: string (rich text / HTML)
  
  isFinal: boolean (default: false)
  finalizedAt: datetime?
  
  createdAt: datetime
  updatedAt: datetime
}

Odontogram {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  
  type: enum (ADULT, CHILD)
  
  teeth: {
    [toothNumber: string]: {
      status: enum (HEALTHY, CARIES, RESTORATION, EXTRACTION, IMPLANT, CROWN, MISSING, IMPACTED)
      surfaces: {
        [surface: string]: status
      }
      notes: string?
      updatedAt: datetime
    }
  }
  
  createdAt: datetime
  updatedAt: datetime
}
```

### 4.5.4 Business Rules

**[BR-EHR-001]** Clinical notes become read-only once appointment is marked as completed.

**[BR-EHR-002]** Odontogram changes create historical snapshots for audit trail.

**[BR-EHR-003]** Treatment plans must be approved before procedures can be started.

**[BR-EHR-004]** Images with "BEFORE" tag require matching "AFTER" tag for comparison feature.

**[BR-EHR-005]** Patient consent must be recorded before sharing records externally.

**[BR-EHR-006]** All record access is logged with timestamp and user ID.

### 4.5.5 User Interface Requirements

**[UI-EHR-001] Odontogram View**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Odontogram - Maria da Silva                    [Adult ▼] [History]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        UPPER                                        │
│     ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│     │18 │17 │16 │15 │14 │13 │12 │11 │21 │22 │23 │24 │25 │26 │27 │28 │
│     │ ○ │ ◐ │ ● │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ◐ │ ○ │ ● │ ○ │ X │
│     └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
│     ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│     │48 │47 │46 │45 │44 │43 │42 │41 │31 │32 │33 │34 │35 │36 │37 │38 │
│     │ X │ ○ │ ● │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ○ │ ◐ │ ○ │ I │
│     └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
│                        LOWER                                        │
│                                                                     │
│  Legend: ○ Healthy  ◐ Restoration  ● Caries  X Missing  I Implant  │
│                                                                     │
│  Selected: Tooth 16 (Upper Right First Molar)                      │
│  Status: Restoration (Composite)                                    │
│  Last updated: Jan 10, 2026                                        │
│                                                                     │
│  [Add Treatment] [View History] [Add Note]                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**[UI-EHR-002] Before/After Comparison**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Before & After Comparison                                     [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐   ┌─────────────────────┐                 │
│  │                     │   │                     │                 │
│  │                     │   │                     │                 │
│  │       BEFORE        │   │       AFTER         │                 │
│  │    Dec 15, 2025     │   │    Jan 10, 2026     │                 │
│  │                     │   │                     │                 │
│  │                     │   │                     │                 │
│  └─────────────────────┘   └─────────────────────┘                 │
│                                                                     │
│  Category: Frontal Smile    Procedure: Teeth Whitening             │
│                                                                     │
│  [◀ Previous] [▶ Next]  [📤 Export]  [📧 Send to Patient]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.5.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/:id/records` | Get all patient records |
| GET | `/patients/:id/anamnesis` | Get anamnesis |
| PUT | `/patients/:id/anamnesis` | Update anamnesis |
| GET | `/patients/:id/odontogram` | Get odontogram |
| PUT | `/patients/:id/odontogram` | Update odontogram |
| GET | `/patients/:id/odontogram/history` | Get odontogram history |
| GET | `/patients/:id/treatment-plans` | List treatment plans |
| POST | `/patients/:id/treatment-plans` | Create treatment plan |
| PUT | `/treatment-plans/:id` | Update treatment plan |
| POST | `/treatment-plans/:id/approve` | Approve treatment plan |
| GET | `/patients/:id/treatments` | List treatments |
| POST | `/treatments` | Create treatment |
| PUT | `/treatments/:id` | Update treatment |
| GET | `/patients/:id/images` | List patient images |
| POST | `/patients/:id/images` | Upload image |
| DELETE | `/images/:id` | Delete image |
| GET | `/images/:id/compare` | Get comparison data |
| GET | `/patients/:id/notes` | List clinical notes |
| POST | `/patients/:id/notes` | Create clinical note |
| PUT | `/notes/:id` | Update clinical note |

---

## 4.6 Reminders and Communication Module

### 4.6.1 Overview

Automated patient communication system supporting WhatsApp text messages, AI-generated voice messages, SMS fallback, and email.

### 4.6.2 Functional Requirements

**[FR-REM-001] Appointment Reminders**
- System shall send automatic reminders before appointments
- Default schedule: 24 hours and 2 hours before (configurable)
- Reminders include: patient name, date, time, professional, clinic address
- Patients can confirm by replying "YES/SIM" or "NO/NÃO"

**[FR-REM-002] Birthday Messages**
- System shall send birthday greetings to patients
- Configurable: on birthday or day before
- Optional: include promotional offer or discount code

**[FR-REM-003] Return Reminders**
- System shall track treatment completion dates
- Automatic reminder at configured interval (30, 60, 90, 180 days)
- Different messages based on procedure type

**[FR-REM-004] WhatsApp Text Messages**
- Integration with Evolution API
- Template-based messages with variable substitution
- Delivery and read status tracking
- Response handling for confirmations

**[FR-REM-005] WhatsApp Voice Messages (AI)**
- Integration with ElevenLabs TTS API
- Convert message template to natural speech
- Configurable voice per clinic
- Support for Portuguese (Brazil) language
- Voice message sent as audio file via WhatsApp

**[FR-REM-006] Message Templates**
- System shall support customizable message templates
- Variables: {{patient.firstName}}, {{appointment.date}}, {{clinic.name}}, etc.
- Preview before saving
- Active/inactive status

**[FR-REM-007] Sending Schedule**
- Configurable sending hours (e.g., 8:00 - 20:00)
- Configurable sending days (e.g., Mon-Sat)
- Messages outside window are queued for next available slot

**[FR-REM-008] Fallback Channels**
- If WhatsApp fails, fallback to SMS
- If SMS fails, fallback to Email
- Configurable fallback behavior per message type

**[FR-REM-009] Message Logs**
- System shall log all sent messages
- Track status: queued, sent, delivered, read, failed
- Include delivery timestamps and error messages

**[FR-REM-010] Manual Message Sending**
- Staff can send individual messages to patients
- Quick actions: "Send reminder now", "Send directions"
- Custom message composition

### 4.6.3 Data Model

```
MessageTemplate {
  id: string (CUID)
  clinicId: string (FK)
  
  name: string
  type: enum (APPOINTMENT_REMINDER, BIRTHDAY, RETURN_REMINDER, SURVEY, CAMPAIGN, CUSTOM)
  channel: enum (WHATSAPP_TEXT, WHATSAPP_AUDIO, SMS, EMAIL)
  
  subject: string? (for email)
  content: string (template with {{variables}})
  
  isActive: boolean (default: true)
  createdAt: datetime
  updatedAt: datetime
}

Reminder {
  id: string (CUID)
  clinicId: string (FK)
  
  type: enum (APPOINTMENT_REMINDER, BIRTHDAY, RETURN_REMINDER, MAINTENANCE)
  
  patientId: string (FK)
  appointmentId: string? (FK)
  templateId: string (FK)
  
  scheduledFor: datetime
  
  status: enum (PENDING, SCHEDULED, SENT, DELIVERED, READ, FAILED, CANCELLED)
  
  sentAt: datetime?
  deliveredAt: datetime?
  readAt: datetime?
  
  response: string?
  errorMessage: string?
  
  createdAt: datetime
}

MessageLog {
  id: string (CUID)
  clinicId: string (FK)
  
  patientId: string (FK)
  reminderId: string? (FK)
  campaignId: string? (FK)
  
  channel: enum (WHATSAPP_TEXT, WHATSAPP_AUDIO, SMS, EMAIL)
  
  content: string (actual sent content)
  audioUrl: string? (for voice messages)
  
  status: enum (QUEUED, SENT, DELIVERED, READ, FAILED)
  
  externalId: string? (Evolution API message ID)
  
  sentAt: datetime?
  deliveredAt: datetime?
  readAt: datetime?
  
  errorMessage: string?
  
  createdAt: datetime
}

ReminderSettings {
  clinicId: string (FK)
  
  appointmentReminders: {
    enabled: boolean
    intervals: number[] (hours before: [24, 2])
    channels: enum[] (priority order)
    textTemplateId: string?
    audioTemplateId: string?
  }
  
  birthdayMessages: {
    enabled: boolean
    daysBefore: number (0 = on birthday)
    templateId: string?
  }
  
  returnReminders: {
    enabled: boolean
    defaultIntervalDays: number
    templateId: string?
  }
  
  sendingHours: {
    start: string ("08:00")
    end: string ("20:00")
    days: string[] (["MON", "TUE", "WED", "THU", "FRI", "SAT"])
  }
  
  fallbackOrder: enum[] ([WHATSAPP_TEXT, SMS, EMAIL])
}
```

### 4.6.4 Business Rules

**[BR-REM-001]** Messages are only sent to patients with opt-in consent.

**[BR-REM-002]** Messages are only sent during configured sending hours.

**[BR-REM-003]** Maximum 3 reminder messages per appointment.

**[BR-REM-004]** Voice messages are limited to 60 seconds duration.

**[BR-REM-005]** Failed messages are retried up to 3 times with exponential backoff.

**[BR-REM-006]** Birthday messages are sent only once per year per patient.

**[BR-REM-007]** Return reminders are only sent if no appointment is already scheduled.

### 4.6.5 Message Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{patient.firstName}}` | Patient first name | Maria |
| `{{patient.fullName}}` | Patient full name | Maria da Silva |
| `{{appointment.date}}` | Formatted date | 14 de Janeiro |
| `{{appointment.time}}` | Formatted time | 14:00 |
| `{{appointment.dayOfWeek}}` | Day of week | Segunda-feira |
| `{{professional.name}}` | Professional name | Dr. João |
| `{{professional.title}}` | Professional title | Dr. |
| `{{clinic.name}}` | Clinic name | Odonto Smile |
| `{{clinic.address}}` | Full address | Rua Example, 123 |
| `{{clinic.phone}}` | Clinic phone | (11) 3333-4444 |
| `{{procedure.name}}` | Procedure name | Limpeza |

### 4.6.6 Voice Message Flow

```
┌─────────────────┐
│ Reminder        │
│ Triggered       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Load Template   │
│ & Variables     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Message   │
│ Text            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call ElevenLabs │
│ TTS API         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Receive Audio   │
│ (MP3/OGG)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upload to S3    │
│ (temporary)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send via        │
│ Evolution API   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log Result      │
│ & Clean Up      │
└─────────────────┘
```

### 4.6.7 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reminders` | List pending reminders |
| POST | `/reminders` | Create manual reminder |
| DELETE | `/reminders/:id` | Cancel reminder |
| POST | `/reminders/:id/send-now` | Send immediately |
| GET | `/message-templates` | List templates |
| POST | `/message-templates` | Create template |
| PUT | `/message-templates/:id` | Update template |
| DELETE | `/message-templates/:id` | Delete template |
| POST | `/message-templates/:id/preview` | Preview with sample data |
| GET | `/message-logs` | List message history |
| GET | `/reminder-settings` | Get settings |
| PUT | `/reminder-settings` | Update settings |
| POST | `/messages/send` | Send custom message |
| POST | `/webhooks/whatsapp` | Receive WhatsApp events |

---

## 4.7 Clinical Documents Module

### 4.7.1 Overview

Generation of standardized clinical documents including prescriptions, certificates, exam requests, and consent forms.

### 4.7.2 Functional Requirements

**[FR-DOC-001] Prescription Generation**
- System shall generate prescriptions with clinic branding
- Support for regular and controlled substance prescriptions
- Medication database with dosage suggestions
- Drug interaction warnings
- Digital signature integration
- PDF generation for printing or digital delivery

**[FR-DOC-002] Medical Certificate Generation**
- Template types: attendance, absence, fitness
- Auto-fill patient and appointment data
- ICD-10 code integration (optional)
- Digital signature
- PDF generation

**[FR-DOC-003] Exam Request Generation**
- Predefined exam lists by category
- Laboratory/clinic partner selection
- Clinical indication field
- QR code for patient identification

**[FR-DOC-004] Consent Forms**
- Procedure-specific consent templates
- Required fields validation
- Digital signature capture (touch/stylus)
- Secure storage with timestamp

**[FR-DOC-005] Document Templates**
- Customizable templates per document type
- Clinic branding (logo, colors, header/footer)
- Variable substitution system
- Preview before generation

**[FR-DOC-006] Procedure-Based Auto-Generation**
- Configure default documents per procedure
- Example: Extraction → Certificate + Prescription + Post-op instructions
- One-click generation of all related documents

**[FR-DOC-007] Document Delivery**
- Print directly
- Download as PDF
- Send via WhatsApp
- Send via Email

### 4.7.3 Data Model

```
DocumentTemplate {
  id: string (CUID)
  clinicId: string (FK)
  
  type: enum (PRESCRIPTION, CERTIFICATE, EXAM_REQUEST, CONSENT, REPORT, INSTRUCTIONS)
  name: string
  
  content: string (HTML template)
  
  paperSize: enum (A4, A5, LETTER)
  orientation: enum (PORTRAIT, LANDSCAPE)
  
  headerHtml: string?
  footerHtml: string?
  
  isDefault: boolean
  isActive: boolean
  
  createdAt: datetime
  updatedAt: datetime
}

PatientDocument {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  appointmentId: string? (FK)
  treatmentId: string? (FK)
  
  templateId: string (FK)
  type: enum (PRESCRIPTION, CERTIFICATE, EXAM_REQUEST, CONSENT, REPORT, INSTRUCTIONS)
  
  title: string
  content: JSON (structured content)
  
  pdfUrl: string? (generated PDF)
  
  // For consent forms
  signedAt: datetime?
  signatureUrl: string? (signature image)
  signerName: string?
  signerCpf: string?
  
  // For prescriptions
  medications: PrescriptionItem[]?
  
  generatedBy: string (FK to user)
  createdAt: datetime
}

PrescriptionItem {
  medication: string
  dosage: string
  frequency: string
  duration: string
  quantity: string
  instructions: string?
}

ProcedureDocumentConfig {
  procedureId: string (FK)
  clinicId: string (FK)
  
  documents: {
    type: enum
    templateId: string
    autoGenerate: boolean
  }[]
}

MedicationDatabase {
  id: string (CUID)
  
  name: string
  activeIngredient: string
  presentation: string
  
  defaultDosage: string?
  defaultFrequency: string?
  
  isControlled: boolean
  controlType: string? (C1, C2, etc.)
  
  interactions: string[]
  contraindications: string[]
  
  isActive: boolean
}
```

### 4.7.4 Business Rules

**[BR-DOC-001]** Controlled substance prescriptions require special formatting per ANVISA regulations.

**[BR-DOC-002]** All generated documents are permanently stored and cannot be deleted.

**[BR-DOC-003]** Consent forms require digital signature before being finalized.

**[BR-DOC-004]** Documents can only be generated by licensed professionals (dentists).

**[BR-DOC-005]** Prescription validity: 30 days (regular), 30 days (controlled - per regulation).

### 4.7.5 User Interface Requirements

**[UI-DOC-001] Prescription Builder**
```
┌─────────────────────────────────────────────────────────────────────┐
│  New Prescription                                              [X] │
├─────────────────────────────────────────────────────────────────────┤
│  Patient: Maria da Silva                                           │
│  Date: January 14, 2026                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Medications                                          [+ Add Item] │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Amoxicillin 500mg                                   [🗑️] │   │
│  │    Dosage: 1 capsule every 8 hours                          │   │
│  │    Duration: 7 days                                         │   │
│  │    Quantity: 21 capsules                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2. Ibuprofen 600mg                                     [🗑️] │   │
│  │    Dosage: 1 tablet every 6 hours if pain                   │   │
│  │    Duration: 3 days                                         │   │
│  │    Quantity: 12 tablets                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Instructions:                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Take with food. Complete the full antibiotic course.        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Preview PDF]                    [Save Draft] [Generate & Sign]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.7.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/document-templates` | List templates |
| POST | `/document-templates` | Create template |
| PUT | `/document-templates/:id` | Update template |
| GET | `/documents` | List documents |
| POST | `/documents` | Generate document |
| GET | `/documents/:id` | Get document |
| GET | `/documents/:id/pdf` | Download PDF |
| POST | `/documents/:id/sign` | Sign document |
| POST | `/documents/:id/send` | Send to patient |
| GET | `/medications` | Search medications |
| GET | `/medications/:id/interactions` | Check interactions |
| GET | `/procedures/:id/document-config` | Get procedure docs config |
| PUT | `/procedures/:id/document-config` | Update procedure docs config |

---

## 4.8 Marketing Campaigns Module

### 4.8.1 Overview

Targeted marketing campaign system with patient segmentation, automated scheduling, and multi-channel delivery.

### 4.8.2 Functional Requirements

**[FR-CAMP-001] Patient Segmentation**
- Filter patients by multiple criteria
- Criteria: demographics, visit history, procedures, financial, tags
- Save segments for reuse
- Preview patient count before campaign

**[FR-CAMP-002] Campaign Types**
- Commemorative dates: Mother's Day, Father's Day, Children's Day, Christmas
- Patient birthdays
- Reactivation (inactive patients)
- Treatment follow-up
- Custom campaigns

**[FR-CAMP-003] Campaign Creation**
- Select campaign type
- Define target segment
- Compose message (text and/or audio)
- Schedule send date/time
- Approval workflow (optional)

**[FR-CAMP-004] Campaign Execution**
- Queue messages respecting rate limits
- Track individual message status
- Real-time progress dashboard
- Pause/resume capability

**[FR-CAMP-005] Campaign Analytics**
- Total contacts reached
- Delivery rate
- Read rate (WhatsApp)
- Response rate
- Appointments generated
- ROI estimation

**[FR-CAMP-006] Automated Campaigns**
- Schedule recurring campaigns
- Trigger-based campaigns (e.g., 6 months after last visit)
- Birthday automation

### 4.8.3 Data Model

```
Segment {
  id: string (CUID)
  clinicId: string (FK)
  
  name: string
  description: string?
  
  filters: {
    birthMonth: number?
    gender: enum?
    ageMin: number?
    ageMax: number?
    lastVisitBefore: date?
    lastVisitAfter: date?
    procedureIds: string[]?
    tags: string[]?
    city: string?
    totalSpentMin: decimal?
    totalSpentMax: decimal?
  }
  
  patientCount: number (cached)
  lastUpdated: datetime
  
  createdAt: datetime
}

Campaign {
  id: string (CUID)
  clinicId: string (FK)
  
  name: string
  type: enum (MOTHERS_DAY, FATHERS_DAY, CHILDRENS_DAY, CHRISTMAS, BIRTHDAY, REACTIVATION, RETURN_REMINDER, CUSTOM)
  
  segmentId: string? (FK)
  customFilters: JSON?
  
  message: string
  channel: enum (WHATSAPP_TEXT, WHATSAPP_AUDIO, SMS, EMAIL)
  
  // Scheduling
  scheduledFor: datetime?
  isRecurring: boolean
  recurrenceRule: string?
  
  status: enum (DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, CANCELLED)
  
  // Metrics
  totalContacts: number
  sent: number
  delivered: number
  read: number
  responded: number
  appointmentsGenerated: number
  
  createdBy: string (FK)
  approvedBy: string? (FK)
  
  createdAt: datetime
  updatedAt: datetime
  executedAt: datetime?
  completedAt: datetime?
}
```

### 4.8.4 Segmentation Filters

| Filter | Description | Operators |
|--------|-------------|-----------|
| Birth Month | Patient's birth month | equals, in list |
| Gender | Patient gender | equals |
| Age | Patient age range | between, greater than, less than |
| Last Visit | Date of last appointment | before, after, between |
| Procedure | Procedures received | includes any, includes all |
| Tags | Patient tags | includes any, includes all |
| City | Patient city | equals, in list |
| Total Spent | Lifetime spend | greater than, less than, between |
| Has Email | Email address exists | true/false |
| WhatsApp Opt-in | Consent status | true/false |

### 4.8.5 User Interface Requirements

**[UI-CAMP-001] Campaign Builder**
```
┌─────────────────────────────────────────────────────────────────────┐
│  New Campaign                                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Step 2 of 4: Define Audience                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Use saved segment: [Select segment... ▼]    or create new filters │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Filters                                        [+ Add Filter]│   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Last visit     [is before ▼]    [6 months ago    ]    [🗑️] │   │
│  │ WhatsApp opt-in [is         ▼]    [Yes            ]    [🗑️] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Preview:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  📊 234 patients match your criteria                        │   │
│  │                                                              │   │
│  │  [View patient list]                                        │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [◀ Back]                                              [Next ▶]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**[UI-CAMP-002] Campaign Dashboard**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Campaign: Mother's Day 2026                        Status: Running │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Progress                                                           │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  45% (106/234)  │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │    234      │ │    106      │ │     98      │ │     12      │   │
│  │   Total     │ │    Sent     │ │  Delivered  │ │    Read     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐                                   │
│  │      3      │ │      1      │                                   │
│  │  Responses  │ │Appointments │                                   │
│  └─────────────┘ └─────────────┘                                   │
│                                                                     │
│  [Pause Campaign]  [View Recipients]  [Export Report]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.8.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/segments` | List segments |
| POST | `/segments` | Create segment |
| PUT | `/segments/:id` | Update segment |
| DELETE | `/segments/:id` | Delete segment |
| GET | `/segments/:id/patients` | Preview patients |
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns/:id` | Get campaign details |
| PUT | `/campaigns/:id` | Update campaign |
| POST | `/campaigns/:id/schedule` | Schedule campaign |
| POST | `/campaigns/:id/execute` | Execute now |
| POST | `/campaigns/:id/pause` | Pause campaign |
| POST | `/campaigns/:id/resume` | Resume campaign |
| POST | `/campaigns/:id/cancel` | Cancel campaign |
| GET | `/campaigns/:id/stats` | Get campaign stats |
| GET | `/campaigns/:id/recipients` | List recipients with status |

---

## 4.9 Patient Satisfaction Module

### 4.9.1 Overview

Patient satisfaction tracking using NPS (Net Promoter Score) and custom surveys at strategic moments in the patient journey.

### 4.9.2 Functional Requirements

**[FR-SAT-001] Survey Types**
- Initial Survey: After first visit/evaluation
- NPS Survey: After treatment completion
- Periodic Survey: For long-term patients

**[FR-SAT-002] Survey Triggers**
- Automatic trigger based on appointment completion
- Configurable delay after appointment (e.g., 2 hours, 24 hours)
- Manual trigger by staff

**[FR-SAT-003] Survey Delivery**
- Send via WhatsApp with short link
- QR code display in office
- Tablet/kiosk mode in reception

**[FR-SAT-004] Survey Questions**
- NPS question (0-10 scale): "How likely are you to recommend?"
- Star rating questions (1-5)
- Multiple choice questions
- Open text feedback

**[FR-SAT-005] Response Collection**
- Mobile-friendly response page
- Anonymous option
- Real-time response recording

**[FR-SAT-006] NPS Dashboard**
- Overall NPS score
- NPS by professional
- NPS trend over time
- Promoters/Passives/Detractors breakdown

**[FR-SAT-007] Negative Feedback Alerts**
- Instant notification when NPS ≤ 6 (Detractor)
- Alert to admin and professional
- Follow-up workflow trigger

**[FR-SAT-008] Response Actions**
- Admin can contact dissatisfied patients
- Log follow-up actions taken
- Track resolution status

### 4.9.3 Data Model

```
Survey {
  id: string (CUID)
  clinicId: string (FK)
  
  name: string
  type: enum (INITIAL, NPS, PERIODIC)
  
  questions: SurveyQuestion[]
  
  trigger: {
    event: enum (APPOINTMENT_COMPLETED, TREATMENT_COMPLETED, MANUAL)
    appointmentTypes: enum[]?
    delayMinutes: number
  }
  
  isActive: boolean
  createdAt: datetime
}

SurveyQuestion {
  id: string
  type: enum (NPS, RATING, MULTIPLE_CHOICE, TEXT)
  question: string
  options: string[]? (for multiple choice)
  required: boolean
  order: number
}

SurveyResponse {
  id: string (CUID)
  clinicId: string (FK)
  surveyId: string (FK)
  patientId: string (FK)
  appointmentId: string? (FK)
  professionalId: string? (FK)
  
  answers: {
    questionId: string
    answer: any (number, string, string[])
  }[]
  
  npsScore: number? (0-10)
  npsCategory: enum (PROMOTER, PASSIVE, DETRACTOR)?
  
  isAnonymous: boolean
  
  // Follow-up tracking
  requiresFollowUp: boolean
  followUpStatus: enum (PENDING, IN_PROGRESS, RESOLVED)?
  followUpNotes: string?
  followUpBy: string? (FK)
  
  submittedAt: datetime
  submittedVia: enum (WHATSAPP, QR_CODE, TABLET, EMAIL)
}

SurveyAlert {
  id: string (CUID)
  clinicId: string (FK)
  responseId: string (FK)
  
  type: enum (DETRACTOR, LOW_RATING)
  
  notifiedUsers: string[] (FK to users)
  notifiedAt: datetime
  
  status: enum (NEW, ACKNOWLEDGED, RESOLVED)
  resolvedBy: string? (FK)
  resolvedAt: datetime?
  resolution: string?
}
```

### 4.9.4 Business Rules

**[BR-SAT-001]** NPS scoring:
- Promoters: 9-10
- Passives: 7-8
- Detractors: 0-6
- NPS = % Promoters - % Detractors

**[BR-SAT-002]** Survey requests are only sent to patients with opt-in consent.

**[BR-SAT-003]** Maximum one survey request per patient per appointment.

**[BR-SAT-004]** Anonymous responses do not link to patient profile for reporting.

**[BR-SAT-005]** Detractor alerts must be acknowledged within 24 hours.

### 4.9.5 User Interface Requirements

**[UI-SAT-001] NPS Dashboard**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Patient Satisfaction                              Period: [Jan ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │                         NPS Score                              │ │
│  │                           +72                                  │ │
│  │                        ▲ +5 vs last month                     │ │
│  │                                                                │ │
│  │   😊 Promoters: 78%    😐 Passives: 16%    😞 Detractors: 6%  │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  NPS by Professional                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Dr. João Silva      ████████████████████████  +82  (45 resp)│   │
│  │ Dra. Maria Santos   ██████████████████████    +75  (38 resp)│   │
│  │ Dr. Pedro Costa     █████████████████         +68  (28 resp)│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Recent Feedback                                    [View All]      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Maria O. - Score: 5 - "Wait time was too long"          │   │
│  │    Jan 12, 2026 - Dr. João    [Contact] [Resolve]          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**[UI-SAT-002] Patient Survey (Mobile)**
```
┌─────────────────────────────┐
│                             │
│    [CLINIC LOGO]            │
│                             │
│  How was your experience?   │
│                             │
│  How likely are you to      │
│  recommend us to a friend?  │
│                             │
│  0 1 2 3 4 5 6 7 8 9 10    │
│  ○ ○ ○ ○ ○ ○ ○ ○ ○ ● ○     │
│                             │
│  Not likely    Very likely  │
│                             │
│  ─────────────────────────  │
│                             │
│  How was the reception?     │
│  ★ ★ ★ ★ ☆                  │
│                             │
│  ─────────────────────────  │
│                             │
│  Any comments?              │
│  ┌─────────────────────────┐│
│  │                         ││
│  │                         ││
│  └─────────────────────────┘│
│                             │
│  [     Submit Feedback     ]│
│                             │
└─────────────────────────────┘
```

### 4.9.6 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/surveys` | List surveys |
| POST | `/surveys` | Create survey |
| PUT | `/surveys/:id` | Update survey |
| GET | `/surveys/:id` | Get survey details |
| GET | `/survey-responses` | List responses |
| GET | `/survey-responses/:id` | Get response details |
| POST | `/survey-responses/:id/follow-up` | Add follow-up action |
| GET | `/surveys/public/:token` | Get public survey (for patients) |
| POST | `/surveys/public/:token/respond` | Submit response |
| GET | `/nps/dashboard` | Get NPS dashboard data |
| GET | `/nps/by-professional` | Get NPS by professional |
| GET | `/nps/trend` | Get NPS trend data |
| GET | `/survey-alerts` | List alerts |
| PUT | `/survey-alerts/:id/acknowledge` | Acknowledge alert |
| PUT | `/survey-alerts/:id/resolve` | Resolve alert |

---

## 4.10 Staff Management Module

### 4.10.1 Overview

Staff management including professional profiles, user accounts, role-based permissions, and commission/fee splitting configuration.

### 4.10.2 Functional Requirements

**[FR-STAFF-001] Professional Registration**
- Register dental professionals with credentials
- Required: name, CRO number, specialty
- Optional: photo, bio, contact info

**[FR-STAFF-002] User Account Management**
- Create user accounts linked to staff profiles
- Assign roles and permissions
- Enable/disable 2FA
- Password reset functionality

**[FR-STAFF-003] Working Hours Configuration**
- Define working hours per professional
- Support different hours per day of week
- Lunch breaks and blocked periods
- Integration with scheduling module

**[FR-STAFF-004] Commission Configuration**
- Commission types: percentage, fixed, per-procedure
- Configure commission rates per professional
- Per-procedure commission tables
- Deduction rules

**[FR-STAFF-005] Commission Calculation**
- Automatic calculation based on completed procedures
- Monthly commission reports
- Approval workflow before payment
- Integration with financial module

**[FR-STAFF-006] Activity Logging**
- Log all user actions for audit
- Track login/logout events
- Record data access and modifications

### 4.10.3 Data Model

```
Professional {
  id: string (CUID)
  clinicId: string (FK)
  userId: string? (FK) // linked user account
  
  name: string
  cro: string
  croState: string
  specialty: string?
  
  photo: string?
  bio: string?
  phone: string?
  email: string?
  
  color: string (calendar color)
  
  workingHours: {
    [dayOfWeek: string]: {
      enabled: boolean
      start: string
      end: string
      breaks: { start: string, end: string }[]
    }
  }
  
  // Commission settings
  commissionType: enum (PERCENTAGE, FIXED, PER_PROCEDURE)
  commissionValue: decimal? (for percentage or fixed)
  commissionTable: {
    procedureId: string
    value: decimal
    type: enum (PERCENTAGE, FIXED)
  }[]?
  
  bankInfo: {
    bankName: string
    agency: string
    account: string
    accountType: enum (CHECKING, SAVINGS)
    pixKey: string?
  }?
  
  hireDate: date?
  isActive: boolean
  
  createdAt: datetime
  updatedAt: datetime
}

Commission {
  id: string (CUID)
  clinicId: string (FK)
  professionalId: string (FK)
  
  period: string (YYYY-MM)
  
  totalProduced: decimal
  commissionValue: decimal
  deductions: decimal
  netValue: decimal
  
  details: {
    appointmentId: string
    procedureId: string
    procedureName: string
    amount: decimal
    commission: decimal
    date: date
  }[]
  
  status: enum (PENDING, APPROVED, PAID)
  
  approvedBy: string? (FK)
  approvedAt: datetime?
  
  paidAt: datetime?
  paymentMethod: string?
  paymentReference: string?
  
  createdAt: datetime
}

ActivityLog {
  id: string (CUID)
  clinicId: string (FK)
  userId: string (FK)
  
  action: string (CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, etc.)
  entity: string (Patient, Appointment, etc.)
  entityId: string?
  
  details: JSON
  
  ipAddress: string?
  userAgent: string?
  
  createdAt: datetime
}
```

### 4.10.4 Business Rules

**[BR-STAFF-001]** CRO number must be valid format for the specified state.

**[BR-STAFF-002]** Only administrators can create or modify staff accounts.

**[BR-STAFF-003]** Commission periods close on the last day of each month.

**[BR-STAFF-004]** Commissions must be approved before payment.

**[BR-STAFF-005]** Deactivated professionals cannot be assigned to new appointments.

**[BR-STAFF-006]** All user actions are logged and cannot be deleted.

### 4.10.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/professionals` | List professionals |
| POST | `/professionals` | Create professional |
| GET | `/professionals/:id` | Get professional details |
| PUT | `/professionals/:id` | Update professional |
| DELETE | `/professionals/:id` | Deactivate professional |
| GET | `/professionals/:id/schedule` | Get working hours |
| PUT | `/professionals/:id/schedule` | Update working hours |
| GET | `/professionals/:id/commissions` | Get commissions |
| GET | `/commissions` | List all commissions |
| GET | `/commissions/:id` | Get commission details |
| POST | `/commissions/:id/approve` | Approve commission |
| POST | `/commissions/:id/pay` | Mark as paid |
| GET | `/users` | List users |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| PUT | `/users/:id/password` | Change password |
| GET | `/activity-logs` | List activity logs |

---

## 4.11 Financial Module

### 4.11.1 Overview

Financial management including treatment budgets, accounts receivable, accounts payable, payment processing, and financial reporting.

### 4.11.2 Functional Requirements

**[FR-FIN-001] Budget/Quote Generation**
- Create treatment budgets from treatment plans
- Itemized pricing per procedure
- Discount application
- Payment plan options
- PDF generation for patient
- Digital approval with signature

**[FR-FIN-002] Payment Recording**
- Record payments against budgets
- Multiple payment methods: cash, credit, debit, PIX, installments
- Partial payment support
- Payment receipt generation

**[FR-FIN-003] Accounts Receivable**
- Track outstanding patient balances
- Payment due date tracking
- Overdue notifications
- Aging report

**[FR-FIN-004] Accounts Payable**
- Record clinic expenses
- Category classification
- Due date tracking
- Recurring expenses

**[FR-FIN-005] Cash Flow**
- Daily cash flow summary
- Incoming vs outgoing
- Bank reconciliation support

**[FR-FIN-006] Financial Reports**
- Revenue by period
- Revenue by professional
- Revenue by procedure
- Expense by category
- Profit/loss statement
- Commission reports

**[FR-FIN-007] Payment Gateway Integration**
- Online payment links
- Credit card processing
- PIX QR code generation
- Automatic payment confirmation

### 4.11.3 Data Model

```
Budget {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  treatmentPlanId: string? (FK)
  
  number: string (sequential)
  
  items: BudgetItem[]
  
  subtotal: decimal
  discount: decimal
  discountType: enum (PERCENTAGE, FIXED)
  total: decimal
  
  status: enum (DRAFT, SENT, APPROVED, REJECTED, EXPIRED)
  
  validUntil: date
  
  approvedAt: datetime?
  approvalSignature: string?
  
  notes: string?
  
  createdBy: string (FK)
  createdAt: datetime
  updatedAt: datetime
}

BudgetItem {
  procedureId: string (FK)
  description: string
  tooth: string?
  quantity: number
  unitPrice: decimal
  totalPrice: decimal
}

Payment {
  id: string (CUID)
  clinicId: string (FK)
  patientId: string (FK)
  budgetId: string? (FK)
  
  amount: decimal
  method: enum (CASH, CREDIT_CARD, DEBIT_CARD, PIX, BANK_TRANSFER, CHECK, OTHER)
  
  installments: number (default: 1)
  installmentNumber: number?
  
  reference: string? (transaction ID, check number, etc.)
  
  receivedAt: datetime
  receivedBy: string (FK)
  
  notes: string?
  
  createdAt: datetime
}

Expense {
  id: string (CUID)
  clinicId: string (FK)
  
  category: string
  description: string
  
  amount: decimal
  
  dueDate: date
  paidAt: datetime?
  
  isRecurring: boolean
  recurrenceRule: string?
  
  supplierId: string?
  invoiceNumber: string?
  
  status: enum (PENDING, PAID, OVERDUE, CANCELLED)
  
  createdBy: string (FK)
  createdAt: datetime
}

Transaction {
  id: string (CUID)
  clinicId: string (FK)
  
  type: enum (INCOME, EXPENSE)
  category: string
  description: string
  
  amount: decimal
  
  paymentId: string? (FK)
  expenseId: string? (FK)
  
  date: date
  
  createdAt: datetime
}
```

### 4.11.4 Business Rules

**[BR-FIN-001]** Budgets expire after validity date and must be regenerated.

**[BR-FIN-002]** Payments cannot exceed budget total.

**[BR-FIN-003]** Approved budgets cannot be modified, only cancelled.

**[BR-FIN-004]** Professional commissions are calculated from completed treatments only.

**[BR-FIN-005]** Financial reports respect user permission levels.

### 4.11.5 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/budgets` | List budgets |
| POST | `/budgets` | Create budget |
| GET | `/budgets/:id` | Get budget details |
| PUT | `/budgets/:id` | Update budget |
| POST | `/budgets/:id/send` | Send to patient |
| POST | `/budgets/:id/approve` | Record approval |
| GET | `/budgets/:id/pdf` | Download PDF |
| GET | `/payments` | List payments |
| POST | `/payments` | Record payment |
| GET | `/payments/:id/receipt` | Generate receipt |
| GET | `/expenses` | List expenses |
| POST | `/expenses` | Create expense |
| PUT | `/expenses/:id` | Update expense |
| POST | `/expenses/:id/pay` | Mark as paid |
| GET | `/transactions` | List transactions |
| GET | `/reports/revenue` | Revenue report |
| GET | `/reports/expenses` | Expense report |
| GET | `/reports/cash-flow` | Cash flow report |
| GET | `/reports/aging` | Aging report |

---

## 4.12 Regulatory Documentation Module

### 4.12.1 Overview

Storage and tracking of regulatory documents, licenses, certifications, and compliance requirements with expiration alerts.

### 4.12.2 Functional Requirements

**[FR-REG-001] Document Categories**
- Sanitary License (Alvará Sanitário)
- CRO Registration
- Operating Permit
- Fire Certificate (AVCB)
- Professional Certifications
- Insurance Policies
- Other regulatory documents

**[FR-REG-002] Document Storage**
- Upload scanned documents
- Store metadata: number, issue date, expiry date, issuing body
- Document versioning for renewals

**[FR-REG-003] Expiration Tracking**
- Track document expiration dates
- Dashboard widget for upcoming expirations
- Automated expiration alerts

**[FR-REG-004] Expiration Alerts**
- Email notifications at: 30 days, 15 days, 7 days, expired
- Dashboard alerts
- Configurable alert recipients

**[FR-REG-005] Audit Support**
- Quick access to all documents for inspections
- Print all documents package
- Export document inventory

### 4.12.3 Data Model

```
ClinicDocument {
  id: string (CUID)
  clinicId: string (FK)
  
  type: enum (SANITARY_LICENSE, CRO_REGISTRATION, OPERATING_PERMIT, FIRE_CERTIFICATE, INSURANCE, CERTIFICATION, CONTRACT, OTHER)
  
  name: string
  description: string?
  
  number: string?
  issuedAt: date?
  expiresAt: date?
  issuingBody: string?
  
  fileUrl: string
  fileName: string
  fileSize: number
  
  // Version tracking
  version: number
  previousVersionId: string? (FK)
  
  notes: string?
  
  uploadedBy: string (FK)
  createdAt: datetime
  updatedAt: datetime
}

DocumentAlert {
  id: string (CUID)
  clinicId: string (FK)
  documentId: string (FK)
  
  type: enum (EXPIRING_30, EXPIRING_15, EXPIRING_7, EXPIRED)
  
  sentAt: datetime
  recipients: string[]
  
  createdAt: datetime
}
```

### 4.12.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clinic-documents` | List documents |
| POST | `/clinic-documents` | Upload document |
| GET | `/clinic-documents/:id` | Get document details |
| PUT | `/clinic-documents/:id` | Update document |
| DELETE | `/clinic-documents/:id` | Delete document |
| GET | `/clinic-documents/:id/download` | Download file |
| GET | `/clinic-documents/expiring` | List expiring documents |
| POST | `/clinic-documents/:id/renew` | Upload renewal |

---

## 4.13 Reports and Dashboard Module

### 4.13.1 Overview

Comprehensive reporting and analytics dashboard providing insights into clinic performance, patient metrics, and operational efficiency.

### 4.13.2 Functional Requirements

**[FR-DASH-001] Main Dashboard**
- Today's appointments summary
- Upcoming birthdays
- Pending returns
- Revenue snapshot
- Occupancy rate
- Recent satisfaction scores
- Document expiration alerts

**[FR-DASH-002] Appointment Reports**
- Appointments by period
- Appointments by professional
- Appointments by type
- No-show rate
- Cancellation rate
- Average wait time

**[FR-DASH-003] Patient Reports**
- New patients by period
- Patient retention rate
- Patient demographics
- Referral sources
- Inactive patients

**[FR-DASH-004] Financial Reports**
- Revenue by period
- Revenue by professional
- Revenue by procedure
- Collection rate
- Outstanding balances
- Commission summary

**[FR-DASH-005] Operational Reports**
- Chair utilization
- Peak hours analysis
- Staff productivity
- Procedure mix

**[FR-DASH-006] Export Options**
- Export to Excel (XLSX)
- Export to PDF
- Email scheduled reports

### 4.13.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get dashboard data |
| GET | `/dashboard/widgets/:widget` | Get specific widget data |
| GET | `/reports/appointments` | Appointment report |
| GET | `/reports/patients` | Patient report |
| GET | `/reports/financial` | Financial report |
| GET | `/reports/procedures` | Procedure report |
| GET | `/reports/professionals` | Professional report |
| POST | `/reports/export` | Export report |
| POST | `/reports/schedule` | Schedule email report |

---

## 4.14 Help Center Module

### 4.14.1 Overview

In-app help center with FAQ, documentation, chatbot for common questions, and support ticket system.

### 4.14.2 Functional Requirements

**[FR-HELP-001] Knowledge Base**
- Organized FAQ articles
- Category navigation
- Full-text search
- Video tutorials embedded

**[FR-HELP-002] Chatbot**
- AI-powered chatbot for common questions
- Suggest relevant articles
- Escalation to human support

**[FR-HELP-003] Support Tickets**
- Create support tickets
- Attach screenshots
- Track ticket status
- Response notifications

**[FR-HELP-004] Contextual Help**
- Tooltip hints throughout UI
- "?" icons linking to relevant help
- Onboarding tours for new users

### 4.14.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/help/articles` | List articles |
| GET | `/help/articles/:id` | Get article |
| GET | `/help/search` | Search articles |
| POST | `/help/chat` | Chat with bot |
| POST | `/support/tickets` | Create ticket |
| GET | `/support/tickets` | List tickets |
| GET | `/support/tickets/:id` | Get ticket |
| POST | `/support/tickets/:id/reply` | Reply to ticket |

---

# 5. External Integrations

## 5.1 WhatsApp Integration (Evolution API)

### 5.1.1 Configuration

```
{
  "instanceName": "clinic_xyz",
  "apiUrl": "https://evolution.example.com",
  "apiKey": "encrypted_key",
  "webhookUrl": "https://api.system.com/webhooks/whatsapp"
}
```

### 5.1.2 Supported Operations

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Send Text | `POST /message/sendText` | Send text message |
| Send Media | `POST /message/sendMedia` | Send audio/image |
| Check Status | `GET /instance/connectionState` | Check connection |
| Receive Webhook | `POST /webhooks/whatsapp` | Receive events |

### 5.1.3 Webhook Events

- `messages.upsert` - New message received
- `messages.update` - Message status update (delivered, read)
- `connection.update` - Connection status change

## 5.2 Voice Generation (ElevenLabs)

### 5.2.1 Configuration

```
{
  "apiKey": "encrypted_key",
  "voiceId": "rachel",
  "modelId": "eleven_multilingual_v2",
  "language": "pt-BR"
}
```

### 5.2.2 API Usage

```
POST /v1/text-to-speech/{voice_id}
Content-Type: application/json

{
  "text": "Message content in Portuguese",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}

Response: audio/mpeg (binary)
```

## 5.3 Payment Gateway

### 5.3.1 Supported Gateways

- Stripe (international)
- Asaas (Brazil)
- PagSeguro (Brazil)

### 5.3.2 Features

- Payment links generation
- Credit card processing
- PIX QR code generation
- Webhook for payment confirmation
- Refund processing

## 5.4 Email Service

### 5.4.1 Supported Providers

- Resend
- SendGrid
- Amazon SES

### 5.4.2 Usage

- Transactional emails (receipts, confirmations)
- Marketing campaigns
- Password reset
- Report delivery

---

# 6. Non-Functional Requirements

## 6.1 Performance

**[NFR-001]** Page load time < 3 seconds for 95th percentile.

**[NFR-002]** API response time < 500ms for 95th percentile.

**[NFR-003]** Support 100 concurrent users per tenant.

**[NFR-004]** Support 1000 tenants on single deployment.

## 6.2 Availability

**[NFR-005]** System availability ≥ 99.5% uptime.

**[NFR-006]** Planned maintenance windows < 4 hours/month.

**[NFR-007]** Maximum unplanned downtime < 1 hour per incident.

## 6.3 Security

**[NFR-008]** All data encrypted at rest (AES-256).

**[NFR-009]** All data encrypted in transit (TLS 1.3).

**[NFR-010]** HTTPS required for all endpoints.

**[NFR-011]** API rate limiting: 100 requests/minute per user.

**[NFR-012]** Complete audit logging of all data access.

**[NFR-013]** LGPD compliance for data handling.

## 6.4 Scalability

**[NFR-014]** Horizontal scaling capability for API layer.

**[NFR-015]** Database read replicas for reporting.

**[NFR-016]** CDN for static assets.

## 6.5 Backup and Recovery

**[NFR-017]** Daily automated backups.

**[NFR-018]** Point-in-time recovery capability (7 days).

**[NFR-019]** Backup retention: 30 days.

**[NFR-020]** Recovery time objective (RTO): 4 hours.

**[NFR-021]** Recovery point objective (RPO): 1 hour.

## 6.6 Compatibility

**[NFR-022]** Browser support: Chrome, Firefox, Safari, Edge (latest 2 versions).

**[NFR-023]** Mobile responsive design.

**[NFR-024]** Progressive Web App (PWA) capability.

---

# 7. Data Dictionary

## 7.1 Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| Clinic | Tenant organization | id, name, cnpj, subdomain |
| User | System user account | id, email, role, clinicId |
| Professional | Dental professional | id, name, cro, specialty |
| Patient | Patient record | id, name, phone, cpf |
| Appointment | Scheduled visit | id, patientId, professionalId, startTime |
| Treatment | Procedure performed | id, patientId, procedureId, tooth |
| TreatmentPlan | Treatment proposal | id, patientId, items, total |
| Budget | Financial quote | id, patientId, items, total |
| Payment | Payment record | id, patientId, amount, method |

## 7.2 Enumeration Values

### Appointment Status
- `SCHEDULED` - Appointment created
- `CONFIRMED` - Patient confirmed
- `WAITING` - Patient arrived
- `IN_PROGRESS` - Currently being treated
- `COMPLETED` - Finished
- `NO_SHOW` - Patient didn't show
- `CANCELLED` - Appointment cancelled

### User Roles
- `ADMIN` - Full access
- `DENTIST` - Clinical access
- `RECEPTIONIST` - Front desk access
- `ASSISTANT` - Limited clinical access
- `FINANCIAL` - Financial access only

### Message Channels
- `WHATSAPP_TEXT` - WhatsApp text message
- `WHATSAPP_AUDIO` - WhatsApp voice message
- `SMS` - SMS text message
- `EMAIL` - Email

---

# 8. Appendices

## 8.1 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | N7 Digital | Initial document |

## 8.2 Related Documents

- Product Requirements Document (PRD)
- Technical Architecture Document
- API Documentation
- Database Schema Documentation
- UI/UX Design System

## 8.3 Glossary

| Term | Definition |
|------|------------|
| Odontogram | Visual chart showing all teeth and their conditions |
| NPS | Net Promoter Score - metric measuring customer loyalty |
| LGPD | Lei Geral de Proteção de Dados - Brazilian data protection law |
| TTS | Text-to-Speech - technology converting text to audio |
| CRO | Conselho Regional de Odontologia - dental regulatory body |
| CNPJ | Cadastro Nacional da Pessoa Jurídica - Brazilian company tax ID |
| CPF | Cadastro de Pessoas Físicas - Brazilian individual tax ID |

---

*End of Document*
