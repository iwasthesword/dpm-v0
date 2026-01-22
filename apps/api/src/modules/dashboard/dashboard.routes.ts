import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { DashboardService } from './dashboard.service.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  const dashboardService = new DashboardService(fastify.prisma);

  // Get dashboard statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get dashboard statistics',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const [
        todaysAppointments,
        totalPatients,
        pendingConfirmations,
        completedThisMonth,
      ] = await Promise.all([
        // Today's appointments
        fastify.prisma.appointment.count({
          where: {
            clinicId: request.user.clinicId,
            startTime: { gte: today, lt: tomorrow },
            status: { notIn: ['CANCELLED'] },
          },
        }),
        // Total active patients
        fastify.prisma.patient.count({
          where: {
            clinicId: request.user.clinicId,
            isActive: true,
          },
        }),
        // Pending confirmations (scheduled but not confirmed)
        fastify.prisma.appointment.count({
          where: {
            clinicId: request.user.clinicId,
            status: 'SCHEDULED',
            startTime: { gte: today },
          },
        }),
        // Completed appointments this month
        fastify.prisma.appointment.count({
          where: {
            clinicId: request.user.clinicId,
            status: 'COMPLETED',
            startTime: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
      ]);

      return reply.send({
        success: true,
        stats: {
          todaysAppointments,
          totalPatients,
          pendingConfirmations,
          completedThisMonth,
        },
      });
    },
  });

  // Get upcoming appointments for today
  fastify.get('/upcoming', {
    schema: {
      description: 'Get upcoming appointments for today',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 5 },
        },
      },
    },
    handler: async (request, reply) => {
      const { limit = 5 } = request.query as any;
      const now = new Date();

      const appointments = await fastify.prisma.appointment.findMany({
        where: {
          clinicId: request.user.clinicId,
          startTime: { gte: now },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        },
        include: {
          patient: {
            select: { id: true, name: true, phone: true, photo: true },
          },
          professional: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take: limit,
      });

      return reply.send({
        success: true,
        appointments,
      });
    },
  });

  // Get recent patients
  fastify.get('/recent-patients', {
    schema: {
      description: 'Get recently added patients',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 5 },
        },
      },
    },
    handler: async (request, reply) => {
      const { limit = 5 } = request.query as any;

      const patients = await fastify.prisma.patient.findMany({
        where: {
          clinicId: request.user.clinicId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photo: true,
          createdAt: true,
        },
      });

      return reply.send({
        success: true,
        patients,
      });
    },
  });

  // Get dashboard health metrics (decision dashboard)
  fastify.get('/health', {
    schema: {
      description: 'Get dashboard health metrics for decision-focused dashboard',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const health = await dashboardService.getHealthMetrics(request.user.clinicId);

      return reply.send({
        success: true,
        health,
      });
    },
  });
}
