import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { z } from 'zod';

const createPatientSchema = z.object({
  name: z.string().min(2).max(200),
  cpf: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().min(10).max(15),
  phoneSecondary: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  guardian: z.object({
    name: z.string(),
    cpf: z.string(),
    relationship: z.string(),
    phone: z.string(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export async function patientRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // List patients
  fastify.get('/', {
    schema: {
      description: 'List patients with pagination and search',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20 },
          tag: { type: 'string' },
          isActive: { type: 'boolean', default: true },
        },
      },
    },
    handler: async (request, reply) => {
      const { search, page = 1, limit = 20, tag, isActive = true } = request.query as any;
      const skip = (page - 1) * limit;

      const where: any = {
        clinicId: request.user.clinicId,
        isActive,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (tag) {
        where.tags = { has: tag };
      }

      const [patients, total] = await Promise.all([
        fastify.prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            cpf: true,
            phone: true,
            email: true,
            photo: true,
            birthDate: true,
            tags: true,
            isActive: true,
            createdAt: true,
          },
        }),
        fastify.prisma.patient.count({ where }),
      ]);

      return reply.send({
        success: true,
        patients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },
  });

  // Get patient by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get patient details by ID',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const patient = await fastify.prisma.patient.findFirst({
        where: {
          id,
          clinicId: request.user.clinicId,
        },
        include: {
          odontogram: true,
          _count: {
            select: {
              appointments: true,
              treatments: true,
              images: true,
              documents: true,
            },
          },
        },
      });

      if (!patient) {
        return reply.status(404).send({
          success: false,
          error: 'Patient not found',
        });
      }

      return reply.send({
        success: true,
        patient,
      });
    },
  });

  // Create patient
  fastify.post('/', {
    schema: {
      description: 'Create a new patient',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', minLength: 2 },
          cpf: { type: 'string' },
          birthDate: { type: 'string', format: 'date-time' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
          phone: { type: 'string' },
          phoneSecondary: { type: 'string' },
          email: { type: 'string', format: 'email' },
          address: { type: 'object' },
          guardian: { type: 'object' },
          tags: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          source: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const result = createPatientSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error.errors[0].message,
        });
      }

      const data = result.data;

      // Check for duplicate CPF if provided
      if (data.cpf) {
        const existing = await fastify.prisma.patient.findFirst({
          where: {
            clinicId: request.user.clinicId,
            cpf: data.cpf,
          },
        });

        if (existing) {
          return reply.status(400).send({
            success: false,
            error: 'A patient with this CPF already exists',
          });
        }
      }

      const patient = await fastify.prisma.patient.create({
        data: {
          clinicId: request.user.clinicId,
          ...data,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        },
      });

      // Create empty odontogram for the patient
      await fastify.prisma.odontogram.create({
        data: {
          clinicId: request.user.clinicId,
          patientId: patient.id,
        },
      });

      return reply.status(201).send({
        success: true,
        patient,
      });
    },
  });

  // Update patient
  fastify.put('/:id', {
    schema: {
      description: 'Update patient details',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      // Check if patient exists and belongs to clinic
      const existing = await fastify.prisma.patient.findFirst({
        where: { id, clinicId: request.user.clinicId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Patient not found',
        });
      }

      const patient = await fastify.prisma.patient.update({
        where: { id },
        data: request.body as any,
      });

      return reply.send({
        success: true,
        patient,
      });
    },
  });

  // Soft delete patient
  fastify.delete('/:id', {
    schema: {
      description: 'Deactivate a patient (soft delete)',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      // Check if patient exists and belongs to clinic
      const existing = await fastify.prisma.patient.findFirst({
        where: { id, clinicId: request.user.clinicId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Patient not found',
        });
      }

      await fastify.prisma.patient.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({
        success: true,
        message: 'Patient deactivated',
      });
    },
  });

  // Get patient appointments
  fastify.get('/:id/appointments', {
    schema: {
      description: 'Get patient appointment history',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const appointments = await fastify.prisma.appointment.findMany({
        where: {
          patientId: id,
          clinicId: request.user.clinicId,
        },
        include: {
          professional: {
            select: { id: true, name: true },
          },
          procedure: {
            select: { id: true, name: true },
          },
          room: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startTime: 'desc' },
      });

      return reply.send({
        success: true,
        appointments,
      });
    },
  });

  // Update anamnesis
  fastify.put('/:id/anamnesis', {
    schema: {
      description: 'Update patient anamnesis (medical history)',
      tags: ['Patients'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const patient = await fastify.prisma.patient.update({
        where: { id },
        data: {
          anamnesis: request.body as any,
        },
      });

      return reply.send({
        success: true,
        anamnesis: patient.anamnesis,
      });
    },
  });
}
