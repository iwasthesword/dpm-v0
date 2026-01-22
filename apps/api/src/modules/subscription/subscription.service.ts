import type { PrismaClient } from '@prisma/client';

export interface UsageMetrics {
  users: { current: number; limit: number };
  patients: { current: number; limit: number };
  appointments: { current: number; limit: number };
  storage: { current: number; limit: number }; // in MB
}

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  async getSubscription(clinicId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: {
        plan: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return null;
    }

    // Check if trial has expired
    if (
      subscription.status === 'TRIALING' &&
      subscription.trialEndsAt &&
      new Date() > subscription.trialEndsAt
    ) {
      // Update status to expired
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });
      subscription.status = 'EXPIRED';
    }

    return subscription;
  }

  async getUsageMetrics(clinicId: string): Promise<UsageMetrics> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get current month start/end
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count users
    const userCount = await this.prisma.user.count({
      where: { clinicId, isActive: true },
    });

    // Count patients
    const patientCount = await this.prisma.patient.count({
      where: { clinicId, isActive: true },
    });

    // Count appointments this month
    const appointmentCount = await this.prisma.appointment.count({
      where: {
        clinicId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Calculate storage from files with fileSize field
    // Currently only ComplianceDocument has fileSize tracked
    const storageResult = await this.prisma.complianceDocument.aggregate({
      where: { clinicId },
      _sum: { fileSize: true },
    });

    // fileSize is stored in bytes, convert to MB
    const storageMB = Math.round((storageResult._sum.fileSize || 0) / (1024 * 1024));

    return {
      users: {
        current: userCount,
        limit: subscription.plan.maxUsers,
      },
      patients: {
        current: patientCount,
        limit: subscription.plan.maxPatients,
      },
      appointments: {
        current: appointmentCount,
        limit: subscription.plan.maxAppointments,
      },
      storage: {
        current: storageMB,
        limit: subscription.plan.maxStorage * 1024, // Convert GB to MB
      },
    };
  }

  async checkUsageLimit(
    clinicId: string,
    metric: 'users' | 'patients' | 'appointments'
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const usage = await this.getUsageMetrics(clinicId);
    const metricData = usage[metric];

    return {
      allowed: metricData.current < metricData.limit,
      current: metricData.current,
      limit: metricData.limit,
    };
  }

  async recordUsage(clinicId: string, metric: string, value: number): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await this.prisma.usageRecord.upsert({
      where: {
        clinicId_metric_periodStart: {
          clinicId,
          metric,
          periodStart,
        },
      },
      update: { value },
      create: {
        clinicId,
        metric,
        value,
        periodStart,
        periodEnd,
      },
    });
  }

  async getTrialDaysRemaining(clinicId: string): Promise<number | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription || subscription.status !== 'TRIALING' || !subscription.trialEndsAt) {
      return null;
    }

    const now = new Date();
    const diffTime = subscription.trialEndsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  async isSubscriptionActive(clinicId: string): Promise<boolean> {
    const subscription = await this.getSubscription(clinicId);

    if (!subscription) return false;

    // Active statuses
    if (subscription.status === 'ACTIVE') return true;

    // Trial is active if not expired
    if (subscription.status === 'TRIALING') {
      if (!subscription.trialEndsAt) return true;
      return new Date() < subscription.trialEndsAt;
    }

    return false;
  }
}
