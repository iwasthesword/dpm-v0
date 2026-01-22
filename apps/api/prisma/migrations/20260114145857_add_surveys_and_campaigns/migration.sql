-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('INITIAL', 'NPS', 'PERIODIC', 'POST_TREATMENT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('NPS', 'STAR_RATING', 'MULTIPLE_CHOICE', 'OPEN_TEXT', 'YES_NO');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('COMMEMORATIVE', 'BIRTHDAY', 'REACTIVATION', 'TREATMENT_FOLLOWUP', 'PROMOTIONAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SurveyType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "triggerAfterDays" INTEGER,
    "thankYouMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "appointmentId" TEXT,
    "npsScore" INTEGER,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_response_answers" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "numericValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_response_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_alerts" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "priority" "AlertPriority" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "patientCount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "segmentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "MessageChannel" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "audioUrl" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_token_key" ON "survey_responses"("token");

-- CreateIndex
CREATE INDEX "survey_responses_clinicId_createdAt_idx" ON "survey_responses"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "survey_responses_token_idx" ON "survey_responses"("token");

-- CreateIndex
CREATE UNIQUE INDEX "survey_alerts_responseId_key" ON "survey_alerts"("responseId");

-- CreateIndex
CREATE INDEX "survey_alerts_clinicId_status_idx" ON "survey_alerts"("clinicId", "status");

-- CreateIndex
CREATE INDEX "campaigns_clinicId_status_idx" ON "campaigns"("clinicId", "status");

-- CreateIndex
CREATE INDEX "campaigns_clinicId_scheduledFor_idx" ON "campaigns"("clinicId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_response_answers" ADD CONSTRAINT "survey_response_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_response_answers" ADD CONSTRAINT "survey_response_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_alerts" ADD CONSTRAINT "survey_alerts_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_alerts" ADD CONSTRAINT "survey_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
