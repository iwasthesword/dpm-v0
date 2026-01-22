import type { FastifyInstance } from 'fastify';
import { PublicService } from './public.service.js';

export async function publicRoutes(fastify: FastifyInstance) {
  const publicService = new PublicService(fastify.prisma);

  // Check subdomain availability
  fastify.get<{
    Params: { subdomain: string };
  }>('/check-subdomain/:subdomain', async (request, reply) => {
    const result = await publicService.checkSubdomainAvailability(request.params.subdomain);
    return reply.send({ success: true, ...result });
  });

  // List available subscription plans
  fastify.get('/plans', async (_request, reply) => {
    const plans = await publicService.getPlans();
    return reply.send({ success: true, plans });
  });

  // Register new clinic
  fastify.post<{
    Body: {
      clinicName: string;
      subdomain: string;
      adminName: string;
      adminEmail: string;
      adminPassword: string;
      phone: string;
      cnpj?: string;
    };
  }>('/register', async (request, reply) => {
    const { clinicName, subdomain, adminName, adminEmail, adminPassword, phone, cnpj } = request.body;

    // Validate required fields
    if (!clinicName || !subdomain || !adminName || !adminEmail || !adminPassword || !phone) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    try {
      const result = await publicService.registerClinic({
        clinicName,
        subdomain,
        adminName,
        adminEmail,
        adminPassword,
        phone,
        cnpj,
      });

      // Generate JWT tokens for auto-login
      const accessToken = fastify.jwt.sign(
        {
          userId: result.user.id,
          clinicId: result.clinic.id,
          role: 'ADMIN' as const,
        },
        { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        {
          userId: result.user.id,
          clinicId: result.clinic.id,
          role: 'ADMIN' as const,
          type: 'refresh' as const,
        },
        { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
      );

      // Store session
      await fastify.prisma.session.create({
        data: {
          userId: result.user.id,
          token: accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        },
      });

      return reply.status(201).send({
        success: true,
        ...result,
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });
}
