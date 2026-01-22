import type { PrismaClient } from '@prisma/client';

export interface OnboardingStatus {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  completedAt: Date | null;
  steps: {
    step: number;
    name: string;
    completed: boolean;
  }[];
}

export interface ClinicInfoData {
  tradeName?: string;
  cnpj: string;
  phone: string;
  email: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface ClinicSettingsData {
  appointmentDuration?: number;
  operatingHours?: {
    monday?: { enabled: boolean; start: string; end: string };
    tuesday?: { enabled: boolean; start: string; end: string };
    wednesday?: { enabled: boolean; start: string; end: string };
    thursday?: { enabled: boolean; start: string; end: string };
    friday?: { enabled: boolean; start: string; end: string };
    saturday?: { enabled: boolean; start: string; end: string };
    sunday?: { enabled: boolean; start: string; end: string };
  };
}

export interface FirstProfessionalData {
  name: string;
  cro: string;
  croState: string;
  specialty?: string;
  phone?: string;
  email?: string;
}

const ONBOARDING_STEPS = [
  { step: 1, name: 'Clinic Info' },
  { step: 2, name: 'Operating Hours' },
  { step: 3, name: 'First Professional' },
];

export class OnboardingService {
  constructor(private prisma: PrismaClient) {}

  async getStatus(clinicId: string): Promise<OnboardingStatus> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        professionals: { take: 1 },
      },
    });

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    // Determine which steps are complete
    const step1Complete = Boolean(clinic.cnpj && !clinic.cnpj.startsWith('TEMP-'));
    const step2Complete = Boolean(
      clinic.settings &&
        typeof clinic.settings === 'object' &&
        'operatingHours' in (clinic.settings as Record<string, unknown>)
    );
    const step3Complete = clinic.professionals.length > 0;

    const steps = ONBOARDING_STEPS.map((s) => ({
      ...s,
      completed:
        s.step === 1 ? step1Complete : s.step === 2 ? step2Complete : s.step === 3 ? step3Complete : false,
    }));

    const completedSteps = steps.filter((s) => s.completed).length;

    return {
      currentStep: clinic.onboardingStep,
      totalSteps: ONBOARDING_STEPS.length,
      isComplete: clinic.onboardingCompletedAt !== null,
      completedAt: clinic.onboardingCompletedAt,
      steps,
    };
  }

  async updateClinicInfo(clinicId: string, data: ClinicInfoData) {
    const clinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tradeName: data.tradeName,
        cnpj: data.cnpj,
        phone: data.phone,
        email: data.email,
        address: data.address,
        onboardingStep: Math.max(1, (await this.getCurrentStep(clinicId)) || 0),
      },
    });

    return clinic;
  }

  async updateClinicSettings(clinicId: string, data: ClinicSettingsData) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    const currentSettings = (clinic.settings as Record<string, unknown>) || {};

    const newSettings = {
      ...currentSettings,
      appointmentDuration: data.appointmentDuration || currentSettings.appointmentDuration || 30,
      operatingHours: data.operatingHours || currentSettings.operatingHours || {},
    };

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        settings: newSettings as object,
        onboardingStep: Math.max(2, clinic.onboardingStep),
      },
    });

    return updatedClinic;
  }

  async createFirstProfessional(clinicId: string, userId: string, data: FirstProfessionalData) {
    // Check if professional already exists
    const existingProfessional = await this.prisma.professional.findFirst({
      where: { clinicId },
    });

    if (existingProfessional) {
      // Update existing
      return this.prisma.professional.update({
        where: { id: existingProfessional.id },
        data: {
          name: data.name,
          cro: data.cro,
          croState: data.croState,
          specialty: data.specialty,
          phone: data.phone,
          email: data.email,
        },
      });
    }

    // Create new professional linked to admin user
    const professional = await this.prisma.professional.create({
      data: {
        clinicId,
        userId,
        name: data.name,
        cro: data.cro,
        croState: data.croState,
        specialty: data.specialty,
        phone: data.phone,
        email: data.email,
      },
    });

    // Update onboarding step
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { onboardingStep: 3 },
    });

    return professional;
  }

  async completeOnboarding(clinicId: string) {
    const status = await this.getStatus(clinicId);

    // Check if all required steps are complete
    const allStepsComplete = status.steps.every((s) => s.completed);

    if (!allStepsComplete) {
      const incompleteSteps = status.steps
        .filter((s) => !s.completed)
        .map((s) => s.name);
      throw new Error(`Please complete the following steps: ${incompleteSteps.join(', ')}`);
    }

    const clinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingStep: ONBOARDING_STEPS.length,
      },
    });

    return clinic;
  }

  async skipOnboarding(clinicId: string) {
    // Allow skipping onboarding but mark it as incomplete
    const clinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        onboardingCompletedAt: new Date(),
      },
    });

    return clinic;
  }

  private async getCurrentStep(clinicId: string): Promise<number> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { onboardingStep: true },
    });
    return clinic?.onboardingStep || 0;
  }
}
