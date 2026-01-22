import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';

export async function clinicRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      description: 'Get current clinic details',
      tags: ['Clinic'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const clinic = await fastify.prisma.clinic.findUnique({
        where: { id: request.user.clinicId },
        select: {
          id: true,
          name: true,
          tradeName: true,
          cnpj: true,
          email: true,
          phone: true,
          subdomain: true,
          timezone: true,
          logo: true,
          address: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!clinic) {
        return reply.status(404).send({
          success: false,
          error: 'Clinic not found',
        });
      }

      return reply.send({
        success: true,
        clinic,
      });
    },
  });

  fastify.put('/', {
    schema: {
      description: 'Update clinic details',
      tags: ['Clinic'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tradeName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          timezone: { type: 'string' },
          address: { type: 'object' },
          settings: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      // Only admins can update clinic
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can update clinic settings',
        });
      }

      const clinic = await fastify.prisma.clinic.update({
        where: { id: request.user.clinicId },
        data: request.body as any,
      });

      return reply.send({
        success: true,
        clinic,
      });
    },
  });

  // Rooms management
  fastify.get('/rooms', {
    schema: {
      description: 'List clinic rooms',
      tags: ['Clinic'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const rooms = await fastify.prisma.room.findMany({
        where: { clinicId: request.user.clinicId },
        orderBy: { name: 'asc' },
      });

      return reply.send({
        success: true,
        rooms,
      });
    },
  });

  fastify.post('/rooms', {
    schema: {
      description: 'Create a new room',
      tags: ['Clinic'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can create rooms',
        });
      }

      const { name, description, color } = request.body as any;

      const room = await fastify.prisma.room.create({
        data: {
          clinicId: request.user.clinicId,
          name,
          description,
          color: color || '#6B7280',
        },
      });

      return reply.status(201).send({
        success: true,
        room,
      });
    },
  });

  // Professionals management
  fastify.get('/professionals', {
    schema: {
      description: 'List clinic professionals',
      tags: ['Clinic'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const professionals = await fastify.prisma.professional.findMany({
        where: {
          clinicId: request.user.clinicId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          cro: true,
          croState: true,
          specialty: true,
          color: true,
          photo: true,
        },
      });

      return reply.send({
        success: true,
        professionals,
      });
    },
  });

  fastify.post('/professionals', {
    schema: {
      description: 'Create a new professional',
      tags: ['Clinic'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'cro', 'croState'],
        properties: {
          name: { type: 'string' },
          cro: { type: 'string' },
          croState: { type: 'string' },
          specialty: { type: 'string' },
          color: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can create professionals',
        });
      }

      const { name, cro, croState, specialty, color } = request.body as any;

      const professional = await fastify.prisma.professional.create({
        data: {
          clinicId: request.user.clinicId,
          name,
          cro,
          croState,
          specialty,
          color: color || '#3B82F6',
        },
      });

      return reply.status(201).send({
        success: true,
        professional,
      });
    },
  });

  // ==================== PROCEDURES ====================

  // Get all procedures
  fastify.get('/procedures', {
    handler: async (request, reply) => {
      const procedures = await fastify.prisma.procedure.findMany({
        where: { clinicId: request.user.clinicId, isActive: true },
        orderBy: { name: 'asc' },
      });

      return reply.send({ success: true, procedures });
    },
  });

  // Create procedure
  fastify.post('/procedures', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can create procedures',
        });
      }

      const { code, name, description, duration, price, category } = request.body as any;

      const procedure = await fastify.prisma.procedure.create({
        data: {
          clinicId: request.user.clinicId,
          code,
          name,
          description,
          duration: duration || 30,
          price,
          category,
        },
      });

      return reply.status(201).send({
        success: true,
        procedure,
      });
    },
  });
}
