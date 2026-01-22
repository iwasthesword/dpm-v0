-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('LICENSE', 'CERTIFICATE', 'INSURANCE', 'EQUIPMENT', 'FACILITY', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_RENEWAL');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('GETTING_STARTED', 'PATIENTS', 'SCHEDULING', 'FINANCIAL', 'CLINICAL', 'SETTINGS', 'FAQ');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_RESPONSE', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "compliance_documents" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "status" "ComplianceStatus" NOT NULL DEFAULT 'VALID',
    "professionalId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "alertSentAt" TIMESTAMP(3),
    "renewalStartedAt" TIMESTAMP(3),

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "lastResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_documents_clinicId_category_idx" ON "compliance_documents"("clinicId", "category");

-- CreateIndex
CREATE INDEX "compliance_documents_clinicId_expirationDate_idx" ON "compliance_documents"("clinicId", "expirationDate");

-- CreateIndex
CREATE INDEX "compliance_documents_professionalId_idx" ON "compliance_documents"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "help_articles_slug_key" ON "help_articles"("slug");

-- CreateIndex
CREATE INDEX "help_articles_category_isPublished_idx" ON "help_articles"("category", "isPublished");

-- CreateIndex
CREATE INDEX "support_tickets_clinicId_status_idx" ON "support_tickets"("clinicId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_idx" ON "ticket_messages"("ticketId");

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
