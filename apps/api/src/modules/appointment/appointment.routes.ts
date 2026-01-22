import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { z } from 'zod';
import { ScheduleService } from './schedule.service.js';

const createAppointmentSchema = z.object({
  patientId: z.string().cuid(),
  professionalId: z.string().cuid(),
  roomId: z.string().cuid().optional(),
  procedureId: z.string().cuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  type: z.enum(['EVALUATION', 'TREATMENT', 'RETURN', 'EMERGENCY', 'MAINTENANCE']),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export async function appointmentRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  const scheduleService = new ScheduleService(fastify.prisma);

  // List appointments (with date range)
  fastify.get('/', {
    schema: {
      description: 'List appointments with filtering',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          professionalId: { type: 'string' },
          status: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { startDate, endDate, professionalId, status, type } = request.query as any;

      const where: any = {
        clinicId: request.user.clinicId,
      };

      if (startDate && endDate) {
        where.startTime = {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        };
      }

      if (professionalId) {
        where.professionalId = professionalId;
      }

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      // If user is a dentist, only show their appointments unless they're admin
      if (request.user.role === 'DENTIST') {
        const professional = await fastify.prisma.professional.findFirst({
          where: { userId: request.user.userId },
        });
        if (professional) {
          where.professionalId = professional.id;
        }
      }

      const appointments = await fastify.prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: { id: true, name: true, phone: true, photo: true },
          },
          professional: {
            select: { id: true, name: true, color: true },
          },
          procedure: {
            select: { id: true, name: true, duration: true, price: true },
          },
          room: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      return reply.send({
        success: true,
        appointments,
      });
    },
  });

  // Get appointment by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get appointment details',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const appointment = await fastify.prisma.appointment.findFirst({
        where: {
          id,
          clinicId: request.user.clinicId,
        },
        include: {
          patient: true,
          professional: true,
          procedure: true,
          room: true,
          treatments: true,
          clinicalNotes: true,
        },
      });

      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: 'Appointment not found',
        });
      }

      return reply.send({
        success: true,
        appointment,
      });
    },
  });

  // Create appointment
  fastify.post('/', {
    schema: {
      description: 'Create a new appointment',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['patientId', 'professionalId', 'startTime', 'endTime', 'type'],
        properties: {
          patientId: { type: 'string' },
          professionalId: { type: 'string' },
          roomId: { type: 'string' },
          procedureId: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          type: { type: 'string', enum: ['EVALUATION', 'TREATMENT', 'RETURN', 'EMERGENCY', 'MAINTENANCE'] },
          notes: { type: 'string' },
          internalNotes: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const result = createAppointmentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error.errors[0].message,
        });
      }

      const data = result.data;
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      // Validate time range
      if (endTime <= startTime) {
        return reply.status(400).send({
          success: false,
          error: 'End time must be after start time',
        });
      }

      // Check for professional conflicts
      const professionalConflict = await fastify.prisma.appointment.findFirst({
        where: {
          clinicId: request.user.clinicId,
          professionalId: data.professionalId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          OR: [
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
          ],
        },
      });

      if (professionalConflict) {
        return reply.status(400).send({
          success: false,
          error: 'Professional has a conflicting appointment at this time',
        });
      }

      // Check for room conflicts if room is specified
      if (data.roomId) {
        const roomConflict = await fastify.prisma.appointment.findFirst({
          where: {
            clinicId: request.user.clinicId,
            roomId: data.roomId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            OR: [
              {
                startTime: { lt: endTime },
                endTime: { gt: startTime },
              },
            ],
          },
        });

        if (roomConflict) {
          return reply.status(400).send({
            success: false,
            error: 'Room is already booked at this time',
          });
        }
      }

      const appointment = await fastify.prisma.appointment.create({
        data: {
          clinicId: request.user.clinicId,
          patientId: data.patientId,
          professionalId: data.professionalId,
          roomId: data.roomId,
          procedureId: data.procedureId,
          startTime,
          endTime,
          type: data.type,
          notes: data.notes,
          internalNotes: data.internalNotes,
          createdBy: request.user.userId,
        },
        include: {
          patient: {
            select: { id: true, name: true, phone: true },
          },
          professional: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        appointment,
      });
    },
  });

  // Update appointment
  fastify.put('/:id', {
    schema: {
      description: 'Update appointment details',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await fastify.prisma.appointment.findFirst({
        where: { id, clinicId: request.user.clinicId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Appointment not found',
        });
      }

      // Don't allow editing completed appointments (only notes)
      if (existing.status === 'COMPLETED') {
        const body = request.body as any;
        const allowedFields = ['notes', 'internalNotes'];
        const hasDisallowedFields = Object.keys(body).some(
          (key) => !allowedFields.includes(key)
        );

        if (hasDisallowedFields) {
          return reply.status(400).send({
            success: false,
            error: 'Completed appointments can only have notes modified',
          });
        }
      }

      const appointment = await fastify.prisma.appointment.update({
        where: { id },
        data: request.body as any,
      });

      return reply.send({
        success: true,
        appointment,
      });
    },
  });

  // Update appointment status
  fastify.post('/:id/status', {
    schema: {
      description: 'Update appointment status',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['SCHEDULED', 'CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
          },
          cancellationReason: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status, cancellationReason } = request.body as any;

      const existing = await fastify.prisma.appointment.findFirst({
        where: { id, clinicId: request.user.clinicId },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Appointment not found',
        });
      }

      const updateData: any = { status };

      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date();
        updateData.confirmedVia = 'manual';
      }

      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = cancellationReason;
        updateData.cancelledBy = request.user.userId;
      }

      const appointment = await fastify.prisma.appointment.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        success: true,
        appointment,
      });
    },
  });

  // Get available slots
  fastify.get('/available-slots', {
    schema: {
      description: 'Find available time slots',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['date', 'professionalId'],
        properties: {
          date: { type: 'string', format: 'date' },
          professionalId: { type: 'string' },
          duration: { type: 'number', default: 30 },
        },
      },
    },
    handler: async (request, reply) => {
      const { date, professionalId, duration = 30 } = request.query as any;

      // Get professional working hours
      const professional = await fastify.prisma.professional.findUnique({
        where: { id: professionalId },
      });

      if (!professional) {
        return reply.status(404).send({
          success: false,
          error: 'Professional not found',
        });
      }

      // Get existing appointments for the day
      const startOfDay = new Date(date);
      const endOfDay = new Date(date + 'T23:59:59.999Z');

      const appointments = await fastify.prisma.appointment.findMany({
        where: {
          clinicId: request.user.clinicId,
          professionalId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { startTime: 'asc' },
      });

      // Calculate available slots (simplified - in production, use working hours)
      const workStart = 8; // 8 AM
      const workEnd = 18; // 6 PM
      const slotDuration = duration;
      const slots: string[] = [];

      for (let hour = workStart; hour < workEnd; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

          // Check if slot conflicts with any appointment
          const hasConflict = appointments.some((apt) => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);
            return slotStart < aptEnd && slotEnd > aptStart;
          });

          if (!hasConflict && slotEnd.getHours() <= workEnd) {
            slots.push(slotStart.toISOString());
          }
        }
      }

      return reply.send({
        success: true,
        slots,
      });
    },
  });

  // Get financial summary for schedule
  fastify.get('/financial-summary', {
    schema: {
      description: 'Get financial summary for schedule view',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
    },
    handler: async (request, reply) => {
      const { startDate, endDate } = request.query as { startDate: string; endDate: string };

      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59.999Z');

      const summary = await scheduleService.getFinancialSummary(
        request.user.clinicId,
        start,
        end
      );

      return reply.send({
        success: true,
        summary,
      });
    },
  });

  // Get risk indicators for a specific appointment
  fastify.get('/:id/risk-indicators', {
    schema: {
      description: 'Get risk indicators for an appointment',
      tags: ['Appointments'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      // Get average procedure price for the clinic
      const avgPriceResult = await fastify.prisma.procedure.aggregate({
        where: { clinicId: request.user.clinicId, isActive: true },
        _avg: { price: true },
      });
      const averageProcedurePrice = Number(avgPriceResult._avg.price || 150);

      const indicators = await scheduleService.getAppointmentRiskIndicators(
        id,
        request.user.clinicId,
        averageProcedurePrice
      );

      return reply.send({
        success: true,
        indicators,
      });
    },
  });
}
