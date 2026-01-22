import type { PrismaClient, ArticleCategory, TicketStatus, TicketPriority } from '@prisma/client';

export interface CreateTicketData {
  subject: string;
  description: string;
  category: ArticleCategory;
  priority?: TicketPriority;
}

export interface CreateMessageData {
  content: string;
  isStaff?: boolean;
}

export interface TicketWithMessages {
  id: string;
  clinicId: string;
  userId: string;
  subject: string;
  description: string;
  category: ArticleCategory;
  priority: TicketPriority;
  status: TicketStatus;
  responseCount: number;
  lastResponseAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  messages: {
    id: string;
    content: string;
    isStaff: boolean;
    createdAt: Date;
    user: {
      id: string;
      name: string;
    } | null;
  }[];
}

export class SupportService {
  constructor(private prisma: PrismaClient) {}

  async listTickets(
    clinicId: string,
    userId?: string,
    status?: TicketStatus
  ): Promise<TicketWithMessages[]> {
    const where: Record<string, unknown> = { clinicId };
    if (userId) where.userId = userId;
    if (status) where.status = status;

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async getTicket(clinicId: string, ticketId: string): Promise<TicketWithMessages | null> {
    return this.prisma.supportTicket.findFirst({
      where: { id: ticketId, clinicId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createTicket(
    clinicId: string,
    userId: string,
    data: CreateTicketData
  ): Promise<TicketWithMessages> {
    return this.prisma.supportTicket.create({
      data: {
        clinic: { connect: { id: clinicId } },
        user: { connect: { id: userId } },
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async addMessage(
    clinicId: string,
    ticketId: string,
    userId: string,
    data: CreateMessageData
  ): Promise<TicketWithMessages | null> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, clinicId },
    });

    if (!ticket) return null;

    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        content: data.content,
        isStaff: data.isStaff || false,
      },
    });

    // Update ticket with response count and timestamp
    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        responseCount: { increment: 1 },
        lastResponseAt: new Date(),
        // If staff replies and ticket is waiting response, mark as in progress
        status: data.isStaff && ticket.status === 'WAITING_RESPONSE' ? 'IN_PROGRESS' : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return updatedTicket;
  }

  async updateTicketStatus(
    clinicId: string,
    ticketId: string,
    status: TicketStatus
  ): Promise<TicketWithMessages | null> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, clinicId },
    });

    if (!ticket) return null;

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getTicketStats(clinicId: string): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    avgResponseTime: number | null;
  }> {
    const [total, open, inProgress, resolved] = await Promise.all([
      this.prisma.supportTicket.count({ where: { clinicId } }),
      this.prisma.supportTicket.count({ where: { clinicId, status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { clinicId, status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({
        where: { clinicId, status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
    ]);

    // Calculate average response time for resolved tickets
    const resolvedTickets = await this.prisma.supportTicket.findMany({
      where: {
        clinicId,
        status: { in: ['RESOLVED', 'CLOSED'] },
        lastResponseAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    let avgResponseTime: number | null = null;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((acc, ticket) => {
        if (ticket.resolvedAt) {
          return acc + (ticket.resolvedAt.getTime() - ticket.createdAt.getTime());
        }
        return acc;
      }, 0);
      avgResponseTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // in hours
    }

    return { total, open, inProgress, resolved, avgResponseTime };
  }
}
