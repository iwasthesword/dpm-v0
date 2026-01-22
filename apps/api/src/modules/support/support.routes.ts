import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { SupportService } from './support.service.js';
import type { ArticleCategory, TicketStatus, TicketPriority } from '@prisma/client';

export async function supportRoutes(fastify: FastifyInstance) {
  const supportService = new SupportService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // List tickets (optionally filtered by status)
  fastify.get<{
    Querystring: { status?: TicketStatus; mine?: boolean };
  }>('/tickets', async (request, reply) => {
    const { status, mine } = request.query;
    const userId = mine ? request.user.userId : undefined;

    const tickets = await supportService.listTickets(request.user.clinicId, userId, status);
    return reply.send({ success: true, tickets });
  });

  // Get ticket stats
  fastify.get('/tickets/stats', async (request, reply) => {
    const stats = await supportService.getTicketStats(request.user.clinicId);
    return reply.send({ success: true, stats });
  });

  // Get single ticket with messages
  fastify.get<{
    Params: { id: string };
  }>('/tickets/:id', async (request, reply) => {
    const ticket = await supportService.getTicket(request.user.clinicId, request.params.id);

    if (!ticket) {
      return reply.status(404).send({ success: false, error: 'Ticket not found' });
    }

    return reply.send({ success: true, ticket });
  });

  // Create new ticket
  fastify.post<{
    Body: {
      subject: string;
      description: string;
      category: ArticleCategory;
      priority?: TicketPriority;
    };
  }>('/tickets', async (request, reply) => {
    const { subject, description, category, priority } = request.body;

    if (!subject || !description || !category) {
      return reply.status(400).send({
        success: false,
        error: 'Subject, description, and category are required',
      });
    }

    const ticket = await supportService.createTicket(request.user.clinicId, request.user.userId, {
      subject,
      description,
      category,
      priority,
    });

    return reply.status(201).send({ success: true, ticket });
  });

  // Add message to ticket
  fastify.post<{
    Params: { id: string };
    Body: { content: string; isStaff?: boolean };
  }>('/tickets/:id/messages', async (request, reply) => {
    const { content, isStaff } = request.body;

    if (!content) {
      return reply.status(400).send({ success: false, error: 'Content is required' });
    }

    const ticket = await supportService.addMessage(
      request.user.clinicId,
      request.params.id,
      request.user.userId,
      { content, isStaff }
    );

    if (!ticket) {
      return reply.status(404).send({ success: false, error: 'Ticket not found' });
    }

    return reply.send({ success: true, ticket });
  });

  // Update ticket status
  fastify.put<{
    Params: { id: string };
    Body: { status: TicketStatus };
  }>('/tickets/:id/status', async (request, reply) => {
    const { status } = request.body;

    if (!status) {
      return reply.status(400).send({ success: false, error: 'Status is required' });
    }

    const ticket = await supportService.updateTicketStatus(
      request.user.clinicId,
      request.params.id,
      status
    );

    if (!ticket) {
      return reply.status(404).send({ success: false, error: 'Ticket not found' });
    }

    return reply.send({ success: true, ticket });
  });
}
