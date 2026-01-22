import type { PrismaClient, CampaignStatus, CampaignType, MessageChannel, Prisma } from '@prisma/client';

export interface SegmentFilters {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  tags?: string[];
  lastVisitDaysAgo?: number;
  noVisitDaysAgo?: number;
  procedures?: string[];
  source?: string;
  hasWhatsApp?: boolean;
  hasEmail?: boolean;
}

export interface SegmentWithCount {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  filters: SegmentFilters;
  patientCount: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  filters: SegmentFilters;
  isActive?: boolean;
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  filters?: SegmentFilters;
  isActive?: boolean;
}

export interface CampaignWithDetails {
  id: string;
  clinicId: string;
  segmentId: string | null;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  channel: MessageChannel;
  subject: string | null;
  content: string;
  audioUrl: string | null;
  scheduledFor: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  segment?: { id: string; name: string } | null;
}

export interface CreateCampaignInput {
  segmentId?: string;
  name: string;
  description?: string;
  type: CampaignType;
  channel: MessageChannel;
  subject?: string;
  content: string;
  audioUrl?: string;
  scheduledFor?: Date;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  type?: CampaignType;
  channel?: MessageChannel;
  subject?: string;
  content?: string;
  audioUrl?: string;
  scheduledFor?: Date;
}

export interface CampaignAnalytics {
  deliveryRate: number;
  openRate: number;
  sentOverTime: { date: string; count: number }[];
}

export class CampaignService {
  constructor(private prisma: PrismaClient) {}

  // ==================== SEGMENTS ====================

  async listSegments(clinicId: string): Promise<SegmentWithCount[]> {
    const segments = await this.prisma.segment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });

    return segments.map((s) => ({
      ...s,
      filters: s.filters as SegmentFilters,
    }));
  }

  async getSegment(clinicId: string, id: string): Promise<SegmentWithCount | null> {
    const segment = await this.prisma.segment.findFirst({
      where: { id, clinicId },
    });

    if (!segment) return null;

    return {
      ...segment,
      filters: segment.filters as SegmentFilters,
    };
  }

  async createSegment(clinicId: string, input: CreateSegmentInput): Promise<SegmentWithCount> {
    // Calculate initial patient count
    const patientCount = await this.countMatchingPatients(clinicId, input.filters);

    const segment = await this.prisma.segment.create({
      data: {
        clinicId,
        name: input.name,
        description: input.description,
        filters: input.filters as Prisma.JsonObject,
        patientCount,
        isActive: input.isActive ?? true,
      },
    });

    return {
      ...segment,
      filters: segment.filters as SegmentFilters,
    };
  }

  async updateSegment(
    clinicId: string,
    id: string,
    input: UpdateSegmentInput
  ): Promise<SegmentWithCount | null> {
    const existing = await this.prisma.segment.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    // Recalculate patient count if filters changed
    let patientCount = existing.patientCount;
    if (input.filters) {
      patientCount = await this.countMatchingPatients(clinicId, input.filters);
    }

    const segment = await this.prisma.segment.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        filters: input.filters as Prisma.JsonObject,
        patientCount,
        isActive: input.isActive,
      },
    });

    return {
      ...segment,
      filters: segment.filters as SegmentFilters,
    };
  }

  async deleteSegment(clinicId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.segment.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return false;

    // Check if segment is used by any campaigns
    const campaignCount = await this.prisma.campaign.count({
      where: { segmentId: id },
    });

    if (campaignCount > 0) {
      throw new Error('Cannot delete segment: it is used by one or more campaigns');
    }

    await this.prisma.segment.delete({ where: { id } });
    return true;
  }

  async previewSegment(
    clinicId: string,
    filters: SegmentFilters,
    limit = 20
  ): Promise<{ count: number; patients: { id: string; name: string; phone: string }[] }> {
    const count = await this.countMatchingPatients(clinicId, filters);
    const patients = await this.getMatchingPatients(clinicId, filters, limit);

    return {
      count,
      patients: patients.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
      })),
    };
  }

  // ==================== CAMPAIGNS ====================

  async listCampaigns(
    clinicId: string,
    status?: CampaignStatus
  ): Promise<CampaignWithDetails[]> {
    const where: any = { clinicId };
    if (status) where.status = status;

    const campaigns = await this.prisma.campaign.findMany({
      where,
      include: {
        segment: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns;
  }

  async getCampaign(clinicId: string, id: string): Promise<CampaignWithDetails | null> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async createCampaign(
    clinicId: string,
    userId: string,
    input: CreateCampaignInput
  ): Promise<CampaignWithDetails> {
    // Calculate target count if segment is specified
    let targetCount = 0;
    if (input.segmentId) {
      const segment = await this.prisma.segment.findFirst({
        where: { id: input.segmentId, clinicId },
      });
      if (!segment) {
        throw new Error('Segment not found');
      }
      targetCount = segment.patientCount ?? 0;
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        clinicId,
        segmentId: input.segmentId,
        name: input.name,
        description: input.description,
        type: input.type,
        channel: input.channel,
        subject: input.subject,
        content: input.content,
        audioUrl: input.audioUrl,
        scheduledFor: input.scheduledFor,
        targetCount,
        createdBy: userId,
      },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async updateCampaign(
    clinicId: string,
    id: string,
    input: UpdateCampaignInput
  ): Promise<CampaignWithDetails | null> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    // Only allow updates if campaign is in DRAFT status
    if (existing.status !== 'DRAFT') {
      throw new Error('Cannot update campaign: campaign is not in DRAFT status');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        channel: input.channel,
        subject: input.subject,
        content: input.content,
        audioUrl: input.audioUrl,
        scheduledFor: input.scheduledFor,
      },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async deleteCampaign(clinicId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return false;

    // Only allow deletion if campaign is in DRAFT status
    if (existing.status !== 'DRAFT') {
      throw new Error('Cannot delete campaign: campaign is not in DRAFT status');
    }

    await this.prisma.campaign.delete({ where: { id } });
    return true;
  }

  // ==================== CAMPAIGN LIFECYCLE ====================

  async scheduleCampaign(
    clinicId: string,
    id: string,
    scheduledFor: Date
  ): Promise<CampaignWithDetails | null> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    if (existing.status !== 'DRAFT') {
      throw new Error('Campaign must be in DRAFT status to schedule');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledFor,
      },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async startCampaign(clinicId: string, id: string): Promise<CampaignWithDetails | null> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
      include: { segment: true },
    });

    if (!existing) return null;

    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
      throw new Error('Campaign must be in DRAFT or SCHEDULED status to start');
    }

    // Get matching patients
    let patients: { id: string; name: string; phone: string; email: string | null }[] = [];
    if (existing.segmentId && existing.segment) {
      patients = await this.getMatchingPatients(
        clinicId,
        existing.segment.filters as SegmentFilters
      );
    }

    // Update campaign status
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        targetCount: patients.length,
      },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    // Create message logs for each patient
    // In a real implementation, this would be handled by a queue
    for (const patient of patients) {
      await this.prisma.messageLog.create({
        data: {
          clinicId,
          patientId: patient.id,
          campaignId: id,
          channel: existing.channel,
          content: existing.content,
          audioUrl: existing.audioUrl,
          status: 'QUEUED',
        },
      });
    }

    return campaign;
  }

  async pauseCampaign(clinicId: string, id: string): Promise<CampaignWithDetails | null> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    if (existing.status !== 'RUNNING') {
      throw new Error('Campaign must be in RUNNING status to pause');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async resumeCampaign(clinicId: string, id: string): Promise<CampaignWithDetails | null> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    if (existing.status !== 'PAUSED') {
      throw new Error('Campaign must be in PAUSED status to resume');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING' },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async cancelCampaign(clinicId: string, id: string): Promise<CampaignWithDetails | null> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new Error('Campaign is already completed or cancelled');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
      include: {
        segment: { select: { id: true, name: true } },
      },
    });

    return campaign;
  }

  async getCampaignAnalytics(clinicId: string, id: string): Promise<CampaignAnalytics | null> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, clinicId },
    });

    if (!campaign) return null;

    const deliveryRate =
      campaign.targetCount > 0
        ? (campaign.deliveredCount / campaign.targetCount) * 100
        : 0;

    const openRate =
      campaign.deliveredCount > 0
        ? (campaign.readCount / campaign.deliveredCount) * 100
        : 0;

    // Get sent over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messageLogs = await this.prisma.messageLog.findMany({
      where: {
        campaignId: id,
        sentAt: { gte: sevenDaysAgo },
      },
      select: { sentAt: true },
    });

    // Group by date
    const sentOverTime: Record<string, number> = {};
    for (const log of messageLogs) {
      if (log.sentAt) {
        const date = log.sentAt.toISOString().split('T')[0];
        sentOverTime[date] = (sentOverTime[date] || 0) + 1;
      }
    }

    return {
      deliveryRate,
      openRate,
      sentOverTime: Object.entries(sentOverTime).map(([date, count]) => ({
        date,
        count,
      })),
    };
  }

  // ==================== HELPER METHODS ====================

  private async countMatchingPatients(
    clinicId: string,
    filters: SegmentFilters
  ): Promise<number> {
    const where = this.buildPatientWhereClause(clinicId, filters);
    return this.prisma.patient.count({ where });
  }

  private async getMatchingPatients(
    clinicId: string,
    filters: SegmentFilters,
    limit?: number
  ): Promise<{ id: string; name: string; phone: string; email: string | null }[]> {
    const where = this.buildPatientWhereClause(clinicId, filters);

    return this.prisma.patient.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      ...(limit && { take: limit }),
    });
  }

  private buildPatientWhereClause(
    clinicId: string,
    filters: SegmentFilters
  ): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = {
      clinicId,
      isActive: true,
    };

    // Age filter
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      const today = new Date();

      if (filters.ageMin !== undefined) {
        const maxBirthDate = new Date(today.getFullYear() - filters.ageMin, today.getMonth(), today.getDate());
        where.birthDate = { ...(where.birthDate as any), lte: maxBirthDate };
      }

      if (filters.ageMax !== undefined) {
        const minBirthDate = new Date(today.getFullYear() - filters.ageMax - 1, today.getMonth(), today.getDate());
        where.birthDate = { ...(where.birthDate as any), gte: minBirthDate };
      }
    }

    // Gender filter
    if (filters.gender) {
      where.gender = filters.gender as any;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    // Source filter
    if (filters.source) {
      where.source = filters.source;
    }

    // Contact channel filters - use gt: '' to filter for non-empty strings (excludes null)
    if (filters.hasWhatsApp) {
      where.whatsappOptIn = true;
      where.phone = { gt: '' };
    }

    if (filters.hasEmail) {
      where.emailOptIn = true;
      where.email = { gt: '' };
    }

    // Note: lastVisitDaysAgo, noVisitDaysAgo, and procedures filters
    // would require subqueries on appointments which is more complex.
    // For simplicity, these are not implemented in this basic version.

    return where;
  }
}
