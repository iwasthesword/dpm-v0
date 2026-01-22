import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { ReportService } from './report.service.js';

export async function reportRoutes(fastify: FastifyInstance) {
  const reportService = new ReportService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Financial summary report
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      format?: 'excel' | 'csv';
    };
  }>('/financial/summary', async (request, reply) => {
    const { startDate, endDate, format = 'excel' } = request.query;

    const result = await reportService.generateFinancialSummary(request.user.clinicId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
    });

    return reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.buffer);
  });

  // Patient list report
  fastify.get<{
    Querystring: {
      format?: 'excel' | 'csv';
    };
  }>('/patients/list', async (request, reply) => {
    const { format = 'excel' } = request.query;

    const result = await reportService.generatePatientList(request.user.clinicId, {
      format,
    });

    return reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.buffer);
  });

  // Appointment history report
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      format?: 'excel' | 'csv';
      professionalId?: string;
    };
  }>('/appointments/history', async (request, reply) => {
    const { startDate, endDate, format = 'excel', professionalId } = request.query;

    const result = await reportService.generateAppointmentHistory(request.user.clinicId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
      professionalId,
    });

    return reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.buffer);
  });

  // Commission report
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      format?: 'excel' | 'csv';
    };
  }>('/staff/commissions', async (request, reply) => {
    const { startDate, endDate, format = 'excel' } = request.query;

    const result = await reportService.generateCommissionReport(request.user.clinicId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
    });

    return reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.buffer);
  });

  // Activity log report
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
      format?: 'excel' | 'csv';
    };
  }>('/audit/activity', async (request, reply) => {
    const { startDate, endDate, format = 'excel' } = request.query;

    const result = await reportService.generateActivityLog(request.user.clinicId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      format,
    });

    return reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.buffer);
  });
}
