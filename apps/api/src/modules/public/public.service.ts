import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{1,18}[a-z0-9])?$/;
const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'ftp',
  'blog',
  'help',
  'support',
  'docs',
  'status',
  'dashboard',
  'billing',
];

export interface RegisterClinicData {
  clinicName: string;
  subdomain: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone: string;
  cnpj?: string;
}

export class PublicService {
  constructor(private prisma: PrismaClient) {}

  async checkSubdomainAvailability(subdomain: string): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const normalized = subdomain.toLowerCase().trim();

    // Validate format
    if (!SUBDOMAIN_REGEX.test(normalized)) {
      return {
        available: false,
        reason: 'Subdomain must be 3-20 characters, lowercase alphanumeric, may contain hyphens (not at start/end)',
      };
    }

    // Check reserved
    if (RESERVED_SUBDOMAINS.includes(normalized)) {
      return {
        available: false,
        reason: 'This subdomain is reserved',
      };
    }

    // Check if already taken
    const existing = await this.prisma.clinic.findUnique({
      where: { subdomain: normalized },
    });

    if (existing) {
      return {
        available: false,
        reason: 'This subdomain is already taken',
      };
    }

    return { available: true };
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async registerClinic(data: RegisterClinicData) {
    const subdomain = data.subdomain.toLowerCase().trim();

    // Validate subdomain
    const subdomainCheck = await this.checkSubdomainAvailability(subdomain);
    if (!subdomainCheck.available) {
      throw new Error(subdomainCheck.reason);
    }

    // Get the free plan for trial
    let freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier: 'FREE', isActive: true },
    });

    // If no free plan exists, get any active plan
    if (!freePlan) {
      freePlan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    }

    if (!freePlan) {
      throw new Error('No subscription plans available. Please contact support.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.adminPassword, 12);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create clinic, admin user, and subscription in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create clinic
      const clinic = await tx.clinic.create({
        data: {
          name: data.clinicName,
          subdomain,
          email: data.adminEmail,
          phone: data.phone,
          cnpj: data.cnpj || `TEMP-${Date.now()}`, // Temporary CNPJ, to be updated in onboarding
          onboardingStep: 0,
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          email: data.adminEmail,
          passwordHash,
          name: data.adminName,
          role: 'ADMIN',
        },
      });

      // Create subscription with trial
      const subscription = await tx.subscription.create({
        data: {
          clinicId: clinic.id,
          planId: freePlan!.id,
          status: 'TRIALING',
          trialEndsAt,
        },
        include: {
          plan: true,
        },
      });

      return { clinic, user, subscription };
    });

    return {
      clinic: {
        id: result.clinic.id,
        name: result.clinic.name,
        subdomain: result.clinic.subdomain,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      subscription: {
        status: result.subscription.status,
        trialEndsAt: result.subscription.trialEndsAt,
        plan: {
          name: result.subscription.plan.name,
          tier: result.subscription.plan.tier,
        },
      },
    };
  }
}
