import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { OnboardingService } from './onboarding.service.js';

export async function onboardingRoutes(fastify: FastifyInstance) {
  const onboardingService = new OnboardingService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get onboarding status
  fastify.get('/status', async (request, reply) => {
    const status = await onboardingService.getStatus(request.user.clinicId);
    return reply.send({ success: true, ...status });
  });

  // Update clinic info (Step 1)
  fastify.put<{
    Body: {
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
    };
  }>('/clinic', async (request, reply) => {
    const { tradeName, cnpj, phone, email, address } = request.body;

    if (!cnpj || !phone || !email) {
      return reply.status(400).send({
        success: false,
        error: 'CNPJ, phone, and email are required',
      });
    }

    try {
      const clinic = await onboardingService.updateClinicInfo(request.user.clinicId, {
        tradeName,
        cnpj,
        phone,
        email,
        address,
      });

      return reply.send({ success: true, clinic });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update clinic info';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Update clinic settings (Step 2)
  fastify.put<{
    Body: {
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
    };
  }>('/settings', async (request, reply) => {
    const { appointmentDuration, operatingHours } = request.body;

    try {
      const clinic = await onboardingService.updateClinicSettings(request.user.clinicId, {
        appointmentDuration,
        operatingHours,
      });

      return reply.send({ success: true, clinic });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Create first professional (Step 3)
  fastify.post<{
    Body: {
      name: string;
      cro: string;
      croState: string;
      specialty?: string;
      phone?: string;
      email?: string;
    };
  }>('/professional', async (request, reply) => {
    const { name, cro, croState, specialty, phone, email } = request.body;

    if (!name || !cro || !croState) {
      return reply.status(400).send({
        success: false,
        error: 'Name, CRO, and CRO state are required',
      });
    }

    try {
      const professional = await onboardingService.createFirstProfessional(
        request.user.clinicId,
        request.user.userId,
        { name, cro, croState, specialty, phone, email }
      );

      return reply.send({ success: true, professional });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create professional';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Complete onboarding
  fastify.post('/complete', async (request, reply) => {
    try {
      const clinic = await onboardingService.completeOnboarding(request.user.clinicId);
      return reply.send({ success: true, clinic });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Skip onboarding
  fastify.post('/skip', async (request, reply) => {
    try {
      const clinic = await onboardingService.skipOnboarding(request.user.clinicId);
      return reply.send({ success: true, clinic });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip onboarding';
      return reply.status(400).send({ success: false, error: message });
    }
  });
}
