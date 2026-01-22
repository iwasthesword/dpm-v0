-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ASSISTANT', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('EVALUATION', 'TREATMENT', 'RETURN', 'EMERGENCY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED', 'PER_PROCEDURE');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TreatmentPlanStatus" AS ENUM ('DRAFT', 'PRESENTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ToothStatus" AS ENUM ('HEALTHY', 'CARIES', 'RESTORATION', 'EXTRACTION', 'IMPLANT', 'CROWN', 'MISSING', 'IMPACTED');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('PHOTO', 'XRAY', 'PANORAMIC', 'CT', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP_TEXT', 'WHATSAPP_AUDIO', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('APPOINTMENT_REMINDER', 'BIRTHDAY', 'RETURN_REMINDER', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "logo" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "whatsappConfig" JSONB,
    "ttsConfig" JSONB,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "cro" TEXT NOT NULL,
    "croState" TEXT NOT NULL,
    "specialty" TEXT,
    "photo" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "workingHours" JSONB,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionValue" DECIMAL(10,2),
    "commissionTable" JSONB,
    "bankInfo" JSONB,
    "hireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "maritalStatus" TEXT,
    "occupation" TEXT,
    "phone" TEXT NOT NULL,
    "phoneSecondary" TEXT,
    "email" TEXT,
    "photo" TEXT,
    "address" JSONB,
    "guardian" JSONB,
    "anamnesis" JSONB,
    "tags" TEXT[],
    "notes" TEXT,
    "source" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT true,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "roomId" TEXT,
    "procedureId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "internalNotes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedVia" TEXT,
    "recurrenceRule" TEXT,
    "recurrenceParentId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "procedureId" TEXT NOT NULL,
    "planItemId" TEXT,
    "tooth" TEXT,
    "quadrant" TEXT,
    "surface" TEXT,
    "notes" TEXT,
    "status" "TreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "presentedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvalSignature" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "tooth" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_images" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "type" "ImageType" NOT NULL,
    "category" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "beforeAfter" TEXT,
    "tooth" TEXT,
    "annotations" JSONB,
    "notes" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "professionalId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odontograms" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ADULT',
    "teeth" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odontograms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odontogram_history" (
    "id" TEXT NOT NULL,
    "odontogramId" TEXT NOT NULL,
    "tooth" TEXT NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odontogram_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "templateId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "response" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reminderId" TEXT,
    "campaignId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "content" TEXT NOT NULL,
    "audioUrl" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "externalId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_settings" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "appointmentReminders" JSONB NOT NULL DEFAULT '{}',
    "birthdayMessages" JSONB NOT NULL DEFAULT '{}',
    "returnReminders" JSONB NOT NULL DEFAULT '{}',
    "sendingHours" JSONB NOT NULL DEFAULT '{}',
    "fallbackOrder" TEXT[] DEFAULT ARRAY['WHATSAPP_TEXT', 'SMS', 'EMAIL']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "orientation" TEXT NOT NULL DEFAULT 'PORTRAIT',
    "headerHtml" TEXT,
    "footerHtml" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_documents" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "treatmentId" TEXT,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signatureUrl" TEXT,
    "signerName" TEXT,
    "signerCpf" TEXT,
    "medications" JSONB,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_cnpj_key" ON "clinics"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_subdomain_key" ON "clinics"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_clinicId_email_key" ON "users"("clinicId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_userId_key" ON "professionals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_clinicId_cpf_key" ON "patients"("clinicId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_clinicId_code_key" ON "procedures"("clinicId", "code");

-- CreateIndex
CREATE INDEX "appointments_clinicId_startTime_idx" ON "appointments"("clinicId", "startTime");

-- CreateIndex
CREATE INDEX "appointments_professionalId_startTime_idx" ON "appointments"("professionalId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "odontograms_patientId_key" ON "odontograms"("patientId");

-- CreateIndex
CREATE INDEX "reminders_clinicId_scheduledFor_idx" ON "reminders"("clinicId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_settings_clinicId_key" ON "reminder_settings"("clinicId");

-- CreateIndex
CREATE INDEX "activity_logs_clinicId_createdAt_idx" ON "activity_logs"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "treatment_plan_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "treatment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_images" ADD CONSTRAINT "patient_images_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_images" ADD CONSTRAINT "patient_images_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_images" ADD CONSTRAINT "patient_images_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "odontograms_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "odontograms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
