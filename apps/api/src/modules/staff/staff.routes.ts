import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';

export async function staffRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // ==================== PROFESSIONALS ====================

  // Get all professionals (with commission details)
  fastify.get('/professionals', {
    handler: async (request, reply) => {
      const { includeInactive } = request.query as { includeInactive?: string };

      const professionals = await fastify.prisma.professional.findMany({
        where: {
          clinicId: request.user.clinicId,
          ...(includeInactive !== 'true' && { isActive: true }),
        },
        orderBy: { name: 'asc' },
        include: {
          user: {
            select: { email: true, role: true, isActive: true },
          },
        },
      });

      return reply.send({ success: true, professionals });
    },
  });

  // Get single professional
  fastify.get<{ Params: { id: string } }>('/professionals/:id', {
    handler: async (request, reply) => {
      const professional = await fastify.prisma.professional.findFirst({
        where: {
          id: request.params.id,
          clinicId: request.user.clinicId,
        },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
        },
      });

      if (!professional) {
        return reply.status(404).send({ success: false, error: 'Professional not found' });
      }

      return reply.send({ success: true, professional });
    },
  });

  // Create professional
  fastify.post('/professionals', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can create professionals',
        });
      }

      const {
        name,
        cro,
        croState,
        specialty,
        phone,
        email,
        color,
        bio,
        workingHours,
        commissionType,
        commissionValue,
        commissionTable,
        bankInfo,
        hireDate,
      } = request.body as any;

      const professional = await fastify.prisma.professional.create({
        data: {
          clinicId: request.user.clinicId,
          name,
          cro,
          croState,
          specialty,
          phone,
          email,
          color: color || '#3B82F6',
          bio,
          workingHours,
          commissionType: commissionType || 'PERCENTAGE',
          commissionValue,
          commissionTable,
          bankInfo,
          hireDate: hireDate ? new Date(hireDate) : null,
        },
      });

      return reply.status(201).send({ success: true, professional });
    },
  });

  // Update professional
  fastify.put<{ Params: { id: string } }>('/professionals/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can update professionals',
        });
      }

      const professional = await fastify.prisma.professional.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!professional) {
        return reply.status(404).send({ success: false, error: 'Professional not found' });
      }

      const {
        name,
        cro,
        croState,
        specialty,
        phone,
        email,
        color,
        bio,
        workingHours,
        commissionType,
        commissionValue,
        commissionTable,
        bankInfo,
        hireDate,
        isActive,
      } = request.body as any;

      const updated = await fastify.prisma.professional.update({
        where: { id: request.params.id },
        data: {
          name,
          cro,
          croState,
          specialty,
          phone,
          email,
          color,
          bio,
          workingHours,
          commissionType,
          commissionValue,
          commissionTable,
          bankInfo,
          hireDate: hireDate ? new Date(hireDate) : undefined,
          isActive,
        },
      });

      return reply.send({ success: true, professional: updated });
    },
  });

  // Deactivate professional
  fastify.delete<{ Params: { id: string } }>('/professionals/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can deactivate professionals',
        });
      }

      const professional = await fastify.prisma.professional.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!professional) {
        return reply.status(404).send({ success: false, error: 'Professional not found' });
      }

      await fastify.prisma.professional.update({
        where: { id: request.params.id },
        data: { isActive: false },
      });

      return reply.send({ success: true });
    },
  });

  // ==================== COMMISSION CALCULATION ====================

  // Calculate commission for a professional in a period
  fastify.get<{ Params: { id: string }; Querystring: { startDate: string; endDate: string } }>(
    '/professionals/:id/commission',
    {
      handler: async (request, reply) => {
        const { startDate, endDate } = request.query;

        const professional = await fastify.prisma.professional.findFirst({
          where: { id: request.params.id, clinicId: request.user.clinicId },
        });

        if (!professional) {
          return reply.status(404).send({ success: false, error: 'Professional not found' });
        }

        // Get completed appointments in the period
        const appointments = await fastify.prisma.appointment.findMany({
          where: {
            professionalId: request.params.id,
            clinicId: request.user.clinicId,
            status: 'COMPLETED',
            startTime: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          include: {
            treatments: {
              include: {
                procedure: true,
              },
            },
          },
        });

        // Calculate total revenue and commission
        let totalRevenue = 0;
        let totalCommission = 0;
        const details: any[] = [];

        for (const apt of appointments) {
          let appointmentRevenue = 0;

          for (const treatment of apt.treatments) {
            const price = Number(treatment.procedure?.price || 0);
            appointmentRevenue += price;
          }

          totalRevenue += appointmentRevenue;

          // Calculate commission based on type
          let commission = 0;
          if (professional.commissionType === 'PERCENTAGE') {
            const percentage = Number(professional.commissionValue) || 0;
            commission = appointmentRevenue * (percentage / 100);
          } else if (professional.commissionType === 'FIXED') {
            commission = Number(professional.commissionValue) || 0;
          } else if (professional.commissionType === 'PER_PROCEDURE') {
            // Use commission table for per-procedure rates
            const table = professional.commissionTable as Record<string, number> | null;
            for (const treatment of apt.treatments) {
              if (table && table[treatment.procedureId]) {
                commission += table[treatment.procedureId];
              } else {
                commission += Number(professional.commissionValue) || 0;
              }
            }
          }

          totalCommission += commission;
          details.push({
            appointmentId: apt.id,
            date: apt.startTime,
            revenue: appointmentRevenue,
            commission,
          });
        }

        return reply.send({
          success: true,
          summary: {
            professionalId: professional.id,
            professionalName: professional.name,
            period: { startDate, endDate },
            totalAppointments: appointments.length,
            totalRevenue,
            totalCommission,
            commissionType: professional.commissionType,
            commissionValue: professional.commissionValue,
          },
          details,
        });
      },
    }
  );

  // ==================== USERS (STAFF ACCOUNTS) ====================

  // Get all users in the clinic
  fastify.get('/users', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can view all users',
        });
      }

      const users = await fastify.prisma.user.findMany({
        where: { clinicId: request.user.clinicId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          professional: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return reply.send({ success: true, users });
    },
  });

  // Create user account
  fastify.post('/users', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can create users',
        });
      }

      const { email, name, role, professionalId } = request.body as any;

      // Check if email already exists in this clinic
      const existing = await fastify.prisma.user.findUnique({
        where: { clinicId_email: { clinicId: request.user.clinicId, email } },
      });

      if (existing) {
        return reply.status(400).send({
          success: false,
          error: 'User with this email already exists',
        });
      }

      // Generate temporary password
      const bcrypt = await import('bcrypt');
      const tempPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const user = await fastify.prisma.user.create({
        data: {
          clinicId: request.user.clinicId,
          email,
          name,
          role,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Link to professional if provided
      if (professionalId) {
        await fastify.prisma.professional.update({
          where: { id: professionalId },
          data: { userId: user.id },
        });
      }

      return reply.status(201).send({
        success: true,
        user,
        temporaryPassword: tempPassword,
      });
    },
  });

  // Update user
  fastify.put<{ Params: { id: string } }>('/users/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can update users',
        });
      }

      const user = await fastify.prisma.user.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const { name, role, isActive } = request.body as any;

      const updated = await fastify.prisma.user.update({
        where: { id: request.params.id },
        data: { name, role, isActive },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return reply.send({ success: true, user: updated });
    },
  });

  // Deactivate user
  fastify.delete<{ Params: { id: string } }>('/users/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can deactivate users',
        });
      }

      const user = await fastify.prisma.user.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      // Cannot deactivate yourself
      if (user.id === request.user.userId) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot deactivate your own account',
        });
      }

      await fastify.prisma.user.update({
        where: { id: request.params.id },
        data: { isActive: false },
      });

      return reply.send({ success: true });
    },
  });
}
