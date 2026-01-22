import type { FastifyRequest, FastifyReply } from 'fastify';
import { SubscriptionService } from '@/modules/subscription/subscription.service.js';

/**
 * Middleware to check if the clinic's subscription is active.
 * Returns 402 Payment Required if subscription is expired or inactive.
 */
export async function requireActiveSubscription(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const clinicId = request.user?.clinicId;

  if (!clinicId) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized - No clinic context',
    });
  }

  const subscriptionService = new SubscriptionService(request.server.prisma);
  const isActive = await subscriptionService.isSubscriptionActive(clinicId);

  if (!isActive) {
    return reply.status(402).send({
      success: false,
      error: 'Payment required - Subscription expired or inactive',
      code: 'SUBSCRIPTION_INACTIVE',
    });
  }
}

/**
 * Middleware factory to check usage limits for a specific metric.
 * Returns 403 Forbidden if usage limit is exceeded.
 */
export function requireUsageLimit(metric: 'users' | 'patients' | 'appointments') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clinicId = request.user?.clinicId;

    if (!clinicId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - No clinic context',
      });
    }

    const subscriptionService = new SubscriptionService(request.server.prisma);
    const usage = await subscriptionService.checkUsageLimit(clinicId, metric);

    if (!usage.allowed) {
      return reply.status(403).send({
        success: false,
        error: `Usage limit exceeded for ${metric}`,
        code: 'USAGE_LIMIT_EXCEEDED',
        details: {
          metric,
          current: usage.current,
          limit: usage.limit,
        },
      });
    }
  };
}

/**
 * Combined middleware that checks both subscription status and usage limit.
 */
export function requireSubscriptionWithLimit(metric: 'users' | 'patients' | 'appointments') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireActiveSubscription(request, reply);
    if (reply.sent) return;

    await requireUsageLimit(metric)(request, reply);
  };
}

/**
 * Middleware to check if the clinic is in trial and add warning headers.
 * Does not block the request, just adds informational headers.
 */
export async function addTrialWarningHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const clinicId = request.user?.clinicId;

  if (!clinicId) return;

  const subscriptionService = new SubscriptionService(request.server.prisma);
  const daysRemaining = await subscriptionService.getTrialDaysRemaining(clinicId);

  if (daysRemaining !== null) {
    reply.header('X-Trial-Days-Remaining', String(daysRemaining));

    if (daysRemaining <= 3) {
      reply.header('X-Trial-Warning', 'true');
    }
  }
}
