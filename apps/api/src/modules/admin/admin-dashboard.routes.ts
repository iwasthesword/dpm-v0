import type { FastifyInstance } from 'fastify';
import { authenticateSuperAdmin } from '@/common/middleware/admin-authenticate.js';

export async function adminDashboardRoutes(fastify: FastifyInstance) {
  // All routes require super admin authentication
  fastify.addHook('onRequest', authenticateSuperAdmin);

  // Get dashboard stats
  fastify.get('/', async (_request, reply) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalClinics,
      activeTrials,
      activeSubscriptions,
      newClinicsThisMonth,
      newClinicsThisWeek,
      subscriptionsByStatus,
      subscriptionsByPlan,
      recentClinics,
    ] = await Promise.all([
      // Total clinics
      fastify.prisma.clinic.count(),

      // Active trials
      fastify.prisma.subscription.count({
        where: {
          status: 'TRIALING',
          trialEndsAt: { gt: now },
        },
      }),

      // Active paid subscriptions
      fastify.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),

      // New clinics this month
      fastify.prisma.clinic.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),

      // New clinics this week
      fastify.prisma.clinic.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      // Subscriptions by status
      fastify.prisma.subscription.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Subscriptions by plan
      fastify.prisma.subscription.groupBy({
        by: ['planId'],
        _count: { planId: true },
      }),

      // Recent clinics
      fastify.prisma.clinic.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      }),
    ]);

    // Get plan names for the groupBy result
    const planIds = subscriptionsByPlan.map((p) => p.planId);
    const plans = await fastify.prisma.subscriptionPlan.findMany({
      where: { id: { in: planIds } },
    });
    const planMap = new Map(plans.map((p) => [p.id, p]));

    // Calculate MRR (Monthly Recurring Revenue)
    const activeWithPlans = await fastify.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const mrr = activeWithPlans.reduce((sum, sub) => {
      const price = Number(sub.plan.price);
      if (sub.plan.billingPeriod === 'yearly') {
        return sum + price / 12;
      }
      return sum + price;
    }, 0);

    return reply.send({
      success: true,
      stats: {
        totalClinics,
        activeTrials,
        activeSubscriptions,
        newClinicsThisMonth,
        newClinicsThisWeek,
        mrr: Math.round(mrr * 100) / 100,
        subscriptionsByStatus: subscriptionsByStatus.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
          plan: planMap.get(s.planId)?.name || 'Unknown',
          tier: planMap.get(s.planId)?.tier || 'Unknown',
          count: s._count.planId,
        })),
      },
      recentClinics: recentClinics.map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        subdomain: clinic.subdomain,
        createdAt: clinic.createdAt,
        subscription: clinic.subscription
          ? {
              status: clinic.subscription.status,
              plan: clinic.subscription.plan.name,
            }
          : null,
      })),
    });
  });

  // Get revenue report
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string };
  }>('/revenue', async (request, reply) => {
    const { startDate, endDate } = request.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 12));
    const end = endDate ? new Date(endDate) : new Date();

    const invoices = await fastify.prisma.invoice.findMany({
      where: {
        status: 'paid',
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    // Group by month
    const monthlyRevenue: Record<string, number> = {};
    for (const invoice of invoices) {
      if (invoice.paidAt) {
        const monthKey = `${invoice.paidAt.getFullYear()}-${String(invoice.paidAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(invoice.amount);
      }
    }

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    return reply.send({
      success: true,
      revenue: {
        total: totalRevenue,
        monthly: Object.entries(monthlyRevenue).map(([month, amount]) => ({
          month,
          amount,
        })),
      },
    });
  });

  // Get all subscription plans (for admin management)
  fastify.get('/plans', async (_request, reply) => {
    const plans = await fastify.prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { price: 'asc' },
    });

    return reply.send({
      success: true,
      plans: plans.map((plan) => ({
        ...plan,
        subscriberCount: plan._count.subscriptions,
      })),
    });
  });
}
