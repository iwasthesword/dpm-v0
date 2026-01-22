import Stripe from 'stripe';
import type { PrismaClient, SubscriptionStatus } from '@prisma/client';

// Lazy initialization - only create Stripe instance when needed
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Stripe features are unavailable.');
    }
    stripeInstance = new Stripe(apiKey);
  }
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export class StripeService {
  constructor(private prisma: PrismaClient) {}

  async createCustomer(clinicId: string, email: string, name: string): Promise<string> {
    const customer = await getStripe().customers.create({
      email,
      name,
      metadata: { clinicId },
    });

    // Update subscription with Stripe customer ID
    await this.prisma.subscription.update({
      where: { clinicId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createCheckoutSession(
    clinicId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: { clinic: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    let customerId = subscription.stripeCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      customerId = await this.createCustomer(
        clinicId,
        subscription.clinic.email,
        subscription.clinic.name
      );
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { clinicId },
      subscription_data: {
        metadata: { clinicId },
      },
    });

    return session.url || '';
  }

  async createBillingPortalSession(clinicId: string, returnUrl: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const clinicId = session.metadata?.clinicId;
    if (!clinicId || !session.subscription) return;

    const stripeSubscription = await getStripe().subscriptions.retrieve(session.subscription as string);

    // Find the plan by Stripe price ID
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = priceId
      ? await this.prisma.subscriptionPlan.findFirst({
          where: { stripePriceId: priceId },
        })
      : null;

    const periodStart = (stripeSubscription as unknown as { current_period_start?: number }).current_period_start;
    const periodEnd = (stripeSubscription as unknown as { current_period_end?: number }).current_period_end;

    await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        status: 'ACTIVE',
        planId: plan?.id,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
        trialEndsAt: null, // Clear trial when subscription becomes active
      },
    });
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const clinicId = stripeSubscription.metadata?.clinicId;
    if (!clinicId) return;

    let status: SubscriptionStatus = 'ACTIVE';
    if (stripeSubscription.status === 'past_due') {
      status = 'PAST_DUE';
    } else if (stripeSubscription.status === 'canceled') {
      status = 'CANCELLED';
    } else if (stripeSubscription.status === 'trialing') {
      status = 'TRIALING';
    }

    // Find the plan by Stripe price ID
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = priceId
      ? await this.prisma.subscriptionPlan.findFirst({
          where: { stripePriceId: priceId },
        })
      : null;

    const periodStart = (stripeSubscription as unknown as { current_period_start?: number }).current_period_start;
    const periodEnd = (stripeSubscription as unknown as { current_period_end?: number }).current_period_end;

    await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        status,
        planId: plan?.id,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      },
    });
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const clinicId = stripeSubscription.metadata?.clinicId;
    if (!clinicId) return;

    await this.prisma.subscription.update({
      where: { clinicId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Handle both old and new Stripe API formats
    const invoiceAny = invoice as unknown as {
      subscription?: string | { id: string } | null;
      period_start?: number;
      period_end?: number;
    };
    const subscriptionId =
      typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id;
    if (!subscriptionId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) return;

    const periodStart = invoiceAny.period_start;
    const periodEnd = invoiceAny.period_end;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status: 'paid',
        paidAt: new Date(),
      },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_paid || 0) / 100,
        status: 'paid',
        pdfUrl: invoice.invoice_pdf || undefined,
        hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
        periodStart: periodStart ? new Date(periodStart * 1000) : new Date(),
        periodEnd: periodEnd ? new Date(periodEnd * 1000) : new Date(),
        paidAt: new Date(),
      },
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const invoiceAny = invoice as unknown as {
      subscription?: string | { id: string } | null;
    };
    const subscriptionId =
      typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id;
    if (!subscriptionId) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });
  }
}
