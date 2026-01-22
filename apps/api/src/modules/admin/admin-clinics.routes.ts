import type { FastifyInstance } from 'fastify';
import type { SubscriptionStatus } from '@prisma/client';
import { AdminClinicsService } from './admin-clinics.service.js';
import { authenticateSuperAdmin } from '@/common/middleware/admin-authenticate.js';

export async function adminClinicsRoutes(fastify: FastifyInstance) {
  const clinicsService = new AdminClinicsService(fastify.prisma);

  // All routes require super admin authentication
  fastify.addHook('onRequest', authenticateSuperAdmin);

  // List all clinics
  fastify.get<{
    Querystring: {
      search?: string;
      status?: SubscriptionStatus;
      planTier?: string;
      page?: string;
      limit?: string;
    };
  }>('/', async (request, reply) => {
    const { search, status, planTier, page, limit } = request.query;

    const result = await clinicsService.listClinics({
      search,
      status,
      planTier,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return reply.send({ success: true, ...result });
  });

  // Get clinic details
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const clinic = await clinicsService.getClinic(request.params.id);

    if (!clinic) {
      return reply.status(404).send({
        success: false,
        error: 'Clinic not found',
      });
    }

    return reply.send({ success: true, clinic });
  });

  // Update clinic
  fastify.put<{
    Params: { id: string };
    Body: { name?: string };
  }>('/:id', async (request, reply) => {
    const { name } = request.body;

    try {
      const clinic = await clinicsService.updateClinic(request.params.id, { name });
      return reply.send({ success: true, clinic });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update clinic';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Extend trial
  fastify.post<{
    Params: { id: string };
    Body: { days: number };
  }>('/:id/extend-trial', async (request, reply) => {
    const { days } = request.body;

    if (!days || days < 1) {
      return reply.status(400).send({
        success: false,
        error: 'Days must be a positive number',
      });
    }

    try {
      const subscription = await clinicsService.extendTrial(request.params.id, days);
      return reply.send({ success: true, subscription });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to extend trial';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Change plan
  fastify.post<{
    Params: { id: string };
    Body: { planId: string };
  }>('/:id/change-plan', async (request, reply) => {
    const { planId } = request.body;

    if (!planId) {
      return reply.status(400).send({
        success: false,
        error: 'Plan ID is required',
      });
    }

    try {
      const subscription = await clinicsService.changePlan(request.params.id, planId);
      return reply.send({ success: true, subscription });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change plan';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  // Update subscription status
  fastify.post<{
    Params: { id: string };
    Body: { status: SubscriptionStatus };
  }>('/:id/subscription-status', async (request, reply) => {
    const { status } = request.body;

    if (!status) {
      return reply.status(400).send({
        success: false,
        error: 'Status is required',
      });
    }

    try {
      const subscription = await clinicsService.updateSubscriptionStatus(request.params.id, status);
      return reply.send({ success: true, subscription });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      return reply.status(400).send({ success: false, error: message });
    }
  });
}
