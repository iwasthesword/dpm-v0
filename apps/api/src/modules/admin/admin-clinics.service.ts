import type { PrismaClient, SubscriptionStatus } from '@prisma/client';

export interface ClinicFilters {
  search?: string;
  status?: SubscriptionStatus;
  planTier?: string;
  page?: number;
  limit?: number;
}

export class AdminClinicsService {
  constructor(private prisma: PrismaClient) {}

  async listClinics(filters: ClinicFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { subdomain: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.subscription = { status: filters.status };
    }

    if (filters.planTier) {
      where.subscription = {
        ...((where.subscription as Record<string, unknown>) || {}),
        plan: { tier: filters.planTier },
      };
    }

    const [clinics, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              users: true,
              patients: true,
              appointments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.clinic.count({ where }),
    ]);

    return {
      clinics: clinics.map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        tradeName: clinic.tradeName,
        subdomain: clinic.subdomain,
        email: clinic.email,
        phone: clinic.phone,
        onboardingComplete: clinic.onboardingCompletedAt !== null,
        createdAt: clinic.createdAt,
        subscription: clinic.subscription
          ? {
              status: clinic.subscription.status,
              trialEndsAt: clinic.subscription.trialEndsAt,
              plan: {
                name: clinic.subscription.plan.name,
                tier: clinic.subscription.plan.tier,
              },
            }
          : null,
        counts: clinic._count,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClinic(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        subscription: {
          include: {
            plan: true,
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
            professionals: true,
          },
        },
      },
    });

    if (!clinic) {
      return null;
    }

    // Derive isActive from subscription status (active if subscription is valid)
    const subscriptionStatus = clinic.subscription?.status;
    const isActive = subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING';

    return {
      id: clinic.id,
      name: clinic.name,
      tradeName: clinic.tradeName,
      subdomain: clinic.subdomain,
      cnpj: clinic.cnpj,
      email: clinic.email,
      phone: clinic.phone,
      address: clinic.address,
      settings: clinic.settings,
      isActive,
      onboardingStep: clinic.onboardingStep,
      onboardingCompletedAt: clinic.onboardingCompletedAt,
      createdAt: clinic.createdAt,
      subscription: clinic.subscription,
      users: clinic.users,
      counts: clinic._count,
    };
  }

  async updateClinic(
    clinicId: string,
    data: {
      name?: string;
      isActive?: boolean;
    }
  ) {
    // For now, just update basic fields
    // Deactivating would need to be handled carefully
    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        name: data.name,
      },
    });
  }

  async extendTrial(clinicId: string, days: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const currentTrialEnd = subscription.trialEndsAt || new Date();
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    return this.prisma.subscription.update({
      where: { clinicId },
      data: {
        trialEndsAt: newTrialEnd,
        status: 'TRIALING',
      },
    });
  }

  async changePlan(clinicId: string, planId: string) {
    return this.prisma.subscription.update({
      where: { clinicId },
      data: { planId },
    });
  }

  async updateSubscriptionStatus(clinicId: string, status: SubscriptionStatus) {
    return this.prisma.subscription.update({
      where: { clinicId },
      data: { status },
    });
  }
}
