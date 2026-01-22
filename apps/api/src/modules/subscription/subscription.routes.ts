import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { SubscriptionService } from './subscription.service.js';
import { StripeService, isStripeConfigured } from '../../integrations/stripe/stripe.service.js';

export async function subscriptionRoutes(fastify: FastifyInstance) {
  const subscriptionService = new SubscriptionService(fastify.prisma);
  const stripeService = new StripeService(fastify.prisma);

  // All routes except webhook require authentication
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip auth for webhook
    if (request.url === '/api/subscription/webhook') {
      return;
    }
    await authenticate(request, reply);
  });

  // Get current subscription
  fastify.get('/', async (request, reply) => {
    const subscription = await subscriptionService.getSubscription(request.user.clinicId);

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: 'No subscription found',
      });
    }

    const trialDaysRemaining = await subscriptionService.getTrialDaysRemaining(request.user.clinicId);

    return reply.send({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        trialDaysRemaining,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          tier: subscription.plan.tier,
          price: subscription.plan.price,
          billingPeriod: subscription.plan.billingPeriod,
          maxUsers: subscription.plan.maxUsers,
          maxPatients: subscription.plan.maxPatients,
          maxAppointments: subscription.plan.maxAppointments,
          maxStorage: subscription.plan.maxStorage,
          features: subscription.plan.features,
        },
      },
    });
  });

  // Get usage metrics
  fastify.get('/usage', async (request, reply) => {
    const usage = await subscriptionService.getUsageMetrics(request.user.clinicId);
    return reply.send({ success: true, usage });
  });

  // Get available plans
  fastify.get('/plans', async (_request, reply) => {
    const plans = await fastify.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return reply.send({ success: true, plans });
  });

  // Create Stripe checkout session
  fastify.post<{
    Body: { planId: string };
  }>('/create-checkout', async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.status(503).send({
        success: false,
        error: 'Payment system is not configured',
      });
    }

    const { planId } = request.body;

    if (!planId) {
      return reply.status(400).send({
        success: false,
        error: 'Plan ID is required',
      });
    }

    const plan = await fastify.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.stripePriceId) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid plan or plan not available for purchase',
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/settings/subscription?success=true`;
    const cancelUrl = `${baseUrl}/settings/subscription?cancelled=true`;

    try {
      const checkoutUrl = await stripeService.createCheckoutSession(
        request.user.clinicId,
        plan.stripePriceId,
        successUrl,
        cancelUrl
      );

      return reply.send({ success: true, url: checkoutUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create checkout session';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // Create Stripe billing portal session
  fastify.post('/create-portal', async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.status(503).send({
        success: false,
        error: 'Payment system is not configured',
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${baseUrl}/settings/subscription`;

    try {
      const portalUrl = await stripeService.createBillingPortalSession(
        request.user.clinicId,
        returnUrl
      );

      return reply.send({ success: true, url: portalUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create portal session';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // Get invoices
  fastify.get('/invoices', async (request, reply) => {
    const subscription = await fastify.prisma.subscription.findUnique({
      where: { clinicId: request.user.clinicId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return reply.send({
      success: true,
      invoices: subscription?.invoices || [],
    });
  });

  // Stripe webhook (raw body required)
  fastify.post(
    '/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      if (!isStripeConfigured()) {
        return reply.status(503).send({ error: 'Payment system is not configured' });
      }

      const signature = request.headers['stripe-signature'] as string;

      if (!signature) {
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      try {
        // @ts-expect-error - rawBody is added by Fastify raw body plugin
        const rawBody = request.rawBody as Buffer;
        await stripeService.handleWebhook(rawBody, signature);
        return reply.send({ received: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Webhook processing failed';
        return reply.status(400).send({ error: message });
      }
    }
  );
}
