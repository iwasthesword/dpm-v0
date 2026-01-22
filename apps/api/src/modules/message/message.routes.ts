import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';

export async function messageRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // ==================== MESSAGE TEMPLATES ====================

  // Get all templates
  fastify.get('/templates', {
    handler: async (request, reply) => {
      const { type, channel } = request.query as { type?: string; channel?: string };

      const where: any = { clinicId: request.user.clinicId };
      if (type) where.type = type;
      if (channel) where.channel = channel;

      const templates = await fastify.prisma.messageTemplate.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      return reply.send({ success: true, templates });
    },
  });

  // Get single template
  fastify.get<{ Params: { id: string } }>('/templates/:id', {
    handler: async (request, reply) => {
      const template = await fastify.prisma.messageTemplate.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      return reply.send({ success: true, template });
    },
  });

  // Create template
  fastify.post('/templates', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can create templates',
        });
      }

      const { name, type, channel, subject, content } = request.body as any;

      const template = await fastify.prisma.messageTemplate.create({
        data: {
          clinicId: request.user.clinicId,
          name,
          type,
          channel,
          subject,
          content,
        },
      });

      return reply.status(201).send({ success: true, template });
    },
  });

  // Update template
  fastify.put<{ Params: { id: string } }>('/templates/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can update templates',
        });
      }

      const template = await fastify.prisma.messageTemplate.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      const { name, type, channel, subject, content, isActive } = request.body as any;

      const updated = await fastify.prisma.messageTemplate.update({
        where: { id: request.params.id },
        data: { name, type, channel, subject, content, isActive },
      });

      return reply.send({ success: true, template: updated });
    },
  });

  // Delete template
  fastify.delete<{ Params: { id: string } }>('/templates/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can delete templates',
        });
      }

      const template = await fastify.prisma.messageTemplate.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      // Check if template is used by any reminders
      const reminderCount = await fastify.prisma.reminder.count({
        where: { templateId: request.params.id },
      });

      if (reminderCount > 0) {
        // Soft delete - just deactivate
        await fastify.prisma.messageTemplate.update({
          where: { id: request.params.id },
          data: { isActive: false },
        });
      } else {
        // Hard delete
        await fastify.prisma.messageTemplate.delete({
          where: { id: request.params.id },
        });
      }

      return reply.send({ success: true });
    },
  });

  // Preview template with variables replaced
  fastify.post<{ Params: { id: string } }>('/templates/:id/preview', {
    handler: async (request, reply) => {
      const { patientId, appointmentId } = request.body as any;

      const template = await fastify.prisma.messageTemplate.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      // Get data for variable replacement
      const patient = patientId
        ? await fastify.prisma.patient.findUnique({
            where: { id: patientId },
            select: { name: true, phone: true },
          })
        : null;

      const appointment = appointmentId
        ? await fastify.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { professional: { select: { name: true } } },
          })
        : null;

      const clinic = await fastify.prisma.clinic.findUnique({
        where: { id: request.user.clinicId },
        select: { name: true, tradeName: true, phone: true },
      });

      // Replace variables
      let content = template.content;
      let subject = template.subject || '';

      const variables: Record<string, string> = {
        '{{patientName}}': patient?.name || 'Nome do Paciente',
        '{{patientFirstName}}': patient?.name?.split(' ')[0] || 'Paciente',
        '{{clinicName}}': clinic?.tradeName || clinic?.name || 'Clínica',
        '{{clinicPhone}}': clinic?.phone || '',
        '{{appointmentDate}}': appointment
          ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(appointment.startTime))
          : 'Data da Consulta',
        '{{appointmentTime}}': appointment
          ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(appointment.startTime))
          : 'Horário',
        '{{professionalName}}': appointment?.professional?.name || 'Profissional',
      };

      for (const [variable, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
        subject = subject.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
      }

      return reply.send({
        success: true,
        preview: {
          subject,
          content,
          channel: template.channel,
        },
      });
    },
  });

  // ==================== REMINDER SETTINGS ====================

  // Get reminder settings
  fastify.get('/settings', {
    handler: async (request, reply) => {
      let settings = await fastify.prisma.reminderSettings.findUnique({
        where: { clinicId: request.user.clinicId },
      });

      if (!settings) {
        // Create default settings
        settings = await fastify.prisma.reminderSettings.create({
          data: {
            clinicId: request.user.clinicId,
            appointmentReminders: { enabled: true, hoursBefore: 24 },
            birthdayMessages: { enabled: true },
            returnReminders: { enabled: true, daysAfter: 180 },
          },
        });
      }

      return reply.send({ success: true, settings });
    },
  });

  // Update reminder settings
  fastify.put('/settings', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can update reminder settings',
        });
      }

      const {
        appointmentReminders,
        birthdayMessages,
        returnReminders,
        sendingHours,
        fallbackOrder,
      } = request.body as any;

      const settings = await fastify.prisma.reminderSettings.upsert({
        where: { clinicId: request.user.clinicId },
        create: {
          clinicId: request.user.clinicId,
          appointmentReminders: appointmentReminders || {},
          birthdayMessages: birthdayMessages || {},
          returnReminders: returnReminders || {},
          sendingHours: sendingHours || {},
          fallbackOrder: fallbackOrder || ['WHATSAPP_TEXT', 'SMS', 'EMAIL'],
        },
        update: {
          ...(appointmentReminders && { appointmentReminders }),
          ...(birthdayMessages && { birthdayMessages }),
          ...(returnReminders && { returnReminders }),
          ...(sendingHours && { sendingHours }),
          ...(fallbackOrder && { fallbackOrder }),
        },
      });

      return reply.send({ success: true, settings });
    },
  });

  // ==================== AVAILABLE VARIABLES ====================

  // Get available template variables
  fastify.get('/variables', {
    handler: async (_request, reply) => {
      const variables = [
        { name: '{{patientName}}', description: 'Nome completo do paciente' },
        { name: '{{patientFirstName}}', description: 'Primeiro nome do paciente' },
        { name: '{{clinicName}}', description: 'Nome da clínica' },
        { name: '{{clinicPhone}}', description: 'Telefone da clínica' },
        { name: '{{appointmentDate}}', description: 'Data da consulta' },
        { name: '{{appointmentTime}}', description: 'Horário da consulta' },
        { name: '{{professionalName}}', description: 'Nome do profissional' },
      ];

      return reply.send({ success: true, variables });
    },
  });
}
