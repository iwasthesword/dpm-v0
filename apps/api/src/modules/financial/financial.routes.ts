import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { FinancialService } from './financial.service.js';

export async function financialRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  const financialService = new FinancialService(fastify.prisma);

  // ==================== PAYMENTS ====================

  // Get all payments with filters
  fastify.get('/payments', {
    handler: async (request, reply) => {
      const { status, patientId, startDate, endDate, limit = 50, offset = 0 } = request.query as any;

      const where: any = { clinicId: request.user.clinicId };

      if (status) where.status = status;
      if (patientId) where.patientId = patientId;
      if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) where.dueDate.gte = new Date(startDate);
        if (endDate) where.dueDate.lte = new Date(endDate);
      }

      const [payments, total] = await Promise.all([
        fastify.prisma.payment.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, phone: true } },
            treatmentPlan: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: Number(limit),
          skip: Number(offset),
        }),
        fastify.prisma.payment.count({ where }),
      ]);

      return reply.send({ success: true, payments, total });
    },
  });

  // Get payment by ID
  fastify.get<{ Params: { id: string } }>('/payments/:id', {
    handler: async (request, reply) => {
      const payment = await fastify.prisma.payment.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
        include: {
          patient: { select: { id: true, name: true, phone: true, email: true } },
          treatmentPlan: { select: { id: true, name: true, totalCost: true } },
          transactions: { orderBy: { date: 'desc' } },
        },
      });

      if (!payment) {
        return reply.status(404).send({ success: false, error: 'Payment not found' });
      }

      return reply.send({ success: true, payment });
    },
  });

  // Create payment
  fastify.post('/payments', {
    handler: async (request, reply) => {
      const {
        patientId,
        treatmentPlanId,
        description,
        amount,
        dueDate,
        installments = 1,
        notes,
      } = request.body as any;

      // Create payment(s) based on installments
      const payments = [];
      const installmentAmount = Number(amount) / installments;

      for (let i = 0; i < installments; i++) {
        const installmentDueDate = new Date(dueDate);
        installmentDueDate.setMonth(installmentDueDate.getMonth() + i);

        const payment = await fastify.prisma.payment.create({
          data: {
            clinicId: request.user.clinicId,
            patientId,
            treatmentPlanId,
            description: installments > 1 ? `${description} (${i + 1}/${installments})` : description,
            amount: installmentAmount,
            dueDate: installmentDueDate,
            installments,
            currentInstallment: i + 1,
            notes,
            createdBy: request.user.userId,
          },
          include: {
            patient: { select: { id: true, name: true } },
          },
        });

        payments.push(payment);
      }

      return reply.status(201).send({ success: true, payments });
    },
  });

  // Record payment (pay)
  fastify.post<{ Params: { id: string } }>('/payments/:id/pay', {
    handler: async (request, reply) => {
      const { amount, method, notes } = request.body as any;

      const payment = await fastify.prisma.payment.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!payment) {
        return reply.status(404).send({ success: false, error: 'Payment not found' });
      }

      const paidAmount = Number(payment.paidAmount) + Number(amount);
      const totalAmount = Number(payment.amount);
      const newStatus = paidAmount >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';

      // Update payment
      const updated = await fastify.prisma.payment.update({
        where: { id: request.params.id },
        data: {
          paidAmount,
          paidAt: newStatus === 'PAID' ? new Date() : payment.paidAt,
          method,
          status: newStatus,
        },
      });

      // Create transaction
      await fastify.prisma.transaction.create({
        data: {
          clinicId: request.user.clinicId,
          paymentId: payment.id,
          type: 'INCOME',
          category: 'treatment',
          description: `Pagamento: ${payment.description}`,
          amount: Number(amount),
          method,
          notes,
          createdBy: request.user.userId,
        },
      });

      return reply.send({ success: true, payment: updated });
    },
  });

  // Cancel payment
  fastify.post<{ Params: { id: string } }>('/payments/:id/cancel', {
    handler: async (request, reply) => {
      const payment = await fastify.prisma.payment.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!payment) {
        return reply.status(404).send({ success: false, error: 'Payment not found' });
      }

      const updated = await fastify.prisma.payment.update({
        where: { id: request.params.id },
        data: { status: 'CANCELLED' },
      });

      return reply.send({ success: true, payment: updated });
    },
  });

  // ==================== TRANSACTIONS ====================

  // Get all transactions with filters
  fastify.get('/transactions', {
    handler: async (request, reply) => {
      const { type, category, startDate, endDate, limit = 50, offset = 0 } = request.query as any;

      const where: any = { clinicId: request.user.clinicId };

      if (type) where.type = type;
      if (category) where.category = category;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const [transactions, total] = await Promise.all([
        fastify.prisma.transaction.findMany({
          where,
          include: {
            payment: {
              select: { id: true, description: true, patient: { select: { name: true } } },
            },
          },
          orderBy: { date: 'desc' },
          take: Number(limit),
          skip: Number(offset),
        }),
        fastify.prisma.transaction.count({ where }),
      ]);

      return reply.send({ success: true, transactions, total });
    },
  });

  // Create transaction (expense or manual income)
  fastify.post('/transactions', {
    handler: async (request, reply) => {
      const { type, category, description, amount, method, date, reference, notes } = request.body as any;

      const transaction = await fastify.prisma.transaction.create({
        data: {
          clinicId: request.user.clinicId,
          type,
          category,
          description,
          amount: Number(amount),
          method,
          date: date ? new Date(date) : new Date(),
          reference,
          notes,
          createdBy: request.user.userId,
        },
      });

      return reply.status(201).send({ success: true, transaction });
    },
  });

  // ==================== REPORTS ====================

  // Financial summary
  fastify.get('/summary', {
    handler: async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      // Get income transactions
      const incomeResult = await fastify.prisma.transaction.aggregate({
        where: {
          clinicId: request.user.clinicId,
          type: 'INCOME',
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
      });

      // Get expense transactions
      const expenseResult = await fastify.prisma.transaction.aggregate({
        where: {
          clinicId: request.user.clinicId,
          type: 'EXPENSE',
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
      });

      // Get pending payments
      const pendingResult = await fastify.prisma.payment.aggregate({
        where: {
          clinicId: request.user.clinicId,
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Get overdue payments
      const overdueResult = await fastify.prisma.payment.aggregate({
        where: {
          clinicId: request.user.clinicId,
          status: { in: ['PENDING', 'PARTIALLY_PAID'] },
          dueDate: { lt: new Date() },
        },
        _sum: { amount: true },
        _count: true,
      });

      const income = Number(incomeResult._sum.amount) || 0;
      const expenses = Number(expenseResult._sum.amount) || 0;

      return reply.send({
        success: true,
        summary: {
          income,
          expenses,
          balance: income - expenses,
          pending: {
            amount: Number(pendingResult._sum.amount) || 0,
            count: pendingResult._count,
          },
          overdue: {
            amount: Number(overdueResult._sum.amount) || 0,
            count: overdueResult._count,
          },
        },
      });
    },
  });

  // Cash flow by period
  fastify.get('/cash-flow', {
    handler: async (request, reply) => {
      const { startDate, endDate, groupBy = 'day' } = request.query as any;

      const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate) : new Date();

      const transactions = await fastify.prisma.transaction.findMany({
        where: {
          clinicId: request.user.clinicId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'asc' },
      });

      // Group transactions by period
      const grouped: Record<string, { income: number; expense: number }> = {};

      for (const tx of transactions) {
        let key: string;
        const date = new Date(tx.date);

        if (groupBy === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = date.toISOString().split('T')[0];
        }

        if (!grouped[key]) {
          grouped[key] = { income: 0, expense: 0 };
        }

        if (tx.type === 'INCOME') {
          grouped[key].income += Number(tx.amount);
        } else {
          grouped[key].expense += Number(tx.amount);
        }
      }

      const cashFlow = Object.entries(grouped).map(([period, data]) => ({
        period,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }));

      return reply.send({ success: true, cashFlow });
    },
  });

  // ==================== ENHANCED REPORTS (Phase 4) ====================

  // Net profit summary
  fastify.get('/net-profit', {
    handler: async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const today = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDate
        ? new Date(endDate)
        : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const netProfit = await financialService.getNetProfitSummary(
        request.user.clinicId,
        start,
        end
      );

      return reply.send({ success: true, netProfit });
    },
  });

  // Accounts receivable (patient balances with aging)
  fastify.get('/accounts-receivable', {
    handler: async (request, reply) => {
      const receivables = await financialService.getAccountsReceivable(
        request.user.clinicId
      );

      return reply.send({ success: true, receivables });
    },
  });

  // Professional commissions
  fastify.get('/commissions', {
    handler: async (request, reply) => {
      const { startDate, endDate, professionalId } = request.query as any;

      const today = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDate
        ? new Date(endDate)
        : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const commissions = await financialService.getCommissionsSummary(
        request.user.clinicId,
        start,
        end,
        professionalId
      );

      return reply.send({ success: true, commissions });
    },
  });

  // Revenue by professional
  fastify.get('/revenue/by-professional', {
    handler: async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const today = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDate
        ? new Date(endDate)
        : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const revenue = await financialService.getRevenueByProfessional(
        request.user.clinicId,
        start,
        end
      );

      return reply.send({ success: true, revenue });
    },
  });

  // Revenue by procedure
  fastify.get('/revenue/by-procedure', {
    handler: async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const today = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDate
        ? new Date(endDate)
        : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const revenue = await financialService.getRevenueByProcedure(
        request.user.clinicId,
        start,
        end
      );

      return reply.send({ success: true, revenue });
    },
  });

  // Profit & Loss statement
  fastify.get('/profit-loss', {
    handler: async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const today = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDate
        ? new Date(endDate)
        : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const profitLoss = await financialService.getProfitLossStatement(
        request.user.clinicId,
        start,
        end
      );

      return reply.send({ success: true, profitLoss });
    },
  });
}
