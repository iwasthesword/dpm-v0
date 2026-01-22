import type { PrismaClient, DocumentCategory, ComplianceStatus } from '@prisma/client';

export interface ComplianceDocumentWithUser {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  category: DocumentCategory;
  documentNumber: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  issueDate: Date | null;
  expirationDate: Date | null;
  status: ComplianceStatus;
  professionalId: string | null;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt: Date;
  notes: string | null;
  alertSentAt: Date | null;
  renewalStartedAt: Date | null;
  professional?: { id: string; name: string } | null;
}

export interface CreateDocumentInput {
  name: string;
  description?: string;
  category: DocumentCategory;
  documentNumber?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  issueDate?: Date;
  expirationDate?: Date;
  professionalId?: string;
  notes?: string;
}

export interface UpdateDocumentInput {
  name?: string;
  description?: string;
  category?: DocumentCategory;
  documentNumber?: string;
  issueDate?: Date;
  expirationDate?: Date;
  professionalId?: string;
  notes?: string;
}

export interface ComplianceDashboard {
  totalDocuments: number;
  validDocuments: number;
  expiringSoonDocuments: number;
  expiredDocuments: number;
  pendingRenewalDocuments: number;
  byCategory: { category: DocumentCategory; count: number }[];
  upcomingExpirations: ComplianceDocumentWithUser[];
}

export class ComplianceService {
  constructor(private prisma: PrismaClient) {}

  async listDocuments(
    clinicId: string,
    category?: DocumentCategory,
    status?: ComplianceStatus,
    professionalId?: string
  ): Promise<ComplianceDocumentWithUser[]> {
    const where: Record<string, unknown> = { clinicId };

    if (category) where.category = category;
    if (status) where.status = status;
    if (professionalId) where.professionalId = professionalId;

    const documents = await this.prisma.complianceDocument.findMany({
      where,
      include: {
        professional: { select: { id: true, name: true } },
      },
      orderBy: [{ expirationDate: 'asc' }, { name: 'asc' }],
    });

    return documents;
  }

  async getDocument(clinicId: string, id: string): Promise<ComplianceDocumentWithUser | null> {
    return this.prisma.complianceDocument.findFirst({
      where: { id, clinicId },
      include: {
        professional: { select: { id: true, name: true } },
      },
    });
  }

  async createDocument(
    clinicId: string,
    userId: string,
    input: CreateDocumentInput
  ): Promise<ComplianceDocumentWithUser> {
    const status = this.calculateStatus(input.expirationDate);

    const document = await this.prisma.complianceDocument.create({
      data: {
        clinicId,
        uploadedBy: userId,
        status,
        ...input,
      },
      include: {
        professional: { select: { id: true, name: true } },
      },
    });

    return document;
  }

  async updateDocument(
    clinicId: string,
    id: string,
    input: UpdateDocumentInput
  ): Promise<ComplianceDocumentWithUser | null> {
    const existing = await this.prisma.complianceDocument.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    // Recalculate status if expiration date changed
    const expirationDate = input.expirationDate ?? existing.expirationDate;
    const status = this.calculateStatus(expirationDate);

    const document = await this.prisma.complianceDocument.update({
      where: { id },
      data: {
        ...input,
        status,
      },
      include: {
        professional: { select: { id: true, name: true } },
      },
    });

    return document;
  }

  async deleteDocument(clinicId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.complianceDocument.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return false;

    await this.prisma.complianceDocument.delete({ where: { id } });
    return true;
  }

  async getExpiringDocuments(clinicId: string, days = 30): Promise<ComplianceDocumentWithUser[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.complianceDocument.findMany({
      where: {
        clinicId,
        OR: [
          { status: 'EXPIRED' },
          { status: 'EXPIRING_SOON' },
          {
            expirationDate: {
              lte: futureDate,
              gte: new Date(),
            },
          },
        ],
      },
      include: {
        professional: { select: { id: true, name: true } },
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async markRenewalStarted(clinicId: string, id: string): Promise<ComplianceDocumentWithUser | null> {
    const existing = await this.prisma.complianceDocument.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    return this.prisma.complianceDocument.update({
      where: { id },
      data: {
        status: 'PENDING_RENEWAL',
        renewalStartedAt: new Date(),
      },
      include: {
        professional: { select: { id: true, name: true } },
      },
    });
  }

  async getDashboard(clinicId: string): Promise<ComplianceDashboard> {
    const [
      totalDocuments,
      validDocuments,
      expiringSoonDocuments,
      expiredDocuments,
      pendingRenewalDocuments,
      byCategory,
      upcomingExpirations,
    ] = await Promise.all([
      this.prisma.complianceDocument.count({ where: { clinicId } }),
      this.prisma.complianceDocument.count({ where: { clinicId, status: 'VALID' } }),
      this.prisma.complianceDocument.count({ where: { clinicId, status: 'EXPIRING_SOON' } }),
      this.prisma.complianceDocument.count({ where: { clinicId, status: 'EXPIRED' } }),
      this.prisma.complianceDocument.count({ where: { clinicId, status: 'PENDING_RENEWAL' } }),
      this.prisma.complianceDocument.groupBy({
        by: ['category'],
        where: { clinicId },
        _count: true,
      }),
      this.getExpiringDocuments(clinicId, 60),
    ]);

    return {
      totalDocuments,
      validDocuments,
      expiringSoonDocuments,
      expiredDocuments,
      pendingRenewalDocuments,
      byCategory: byCategory.map((b) => ({
        category: b.category,
        count: b._count,
      })),
      upcomingExpirations: upcomingExpirations.slice(0, 10),
    };
  }

  async updateStatuses(clinicId: string): Promise<number> {
    // Get all documents that need status updates
    const documents = await this.prisma.complianceDocument.findMany({
      where: {
        clinicId,
        expirationDate: { not: null },
        status: { not: 'PENDING_RENEWAL' },
      },
    });

    let updated = 0;
    for (const doc of documents) {
      const newStatus = this.calculateStatus(doc.expirationDate);
      if (newStatus !== doc.status) {
        await this.prisma.complianceDocument.update({
          where: { id: doc.id },
          data: { status: newStatus },
        });
        updated++;
      }
    }

    return updated;
  }

  private calculateStatus(expirationDate: Date | null | undefined): ComplianceStatus {
    if (!expirationDate) return 'VALID';

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expirationDate < now) {
      return 'EXPIRED';
    } else if (expirationDate <= thirtyDaysFromNow) {
      return 'EXPIRING_SOON';
    }

    return 'VALID';
  }
}
