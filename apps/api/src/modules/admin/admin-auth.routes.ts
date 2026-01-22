import type { FastifyInstance } from 'fastify';
import { AdminAuthService } from './admin-auth.service.js';

export async function adminAuthRoutes(fastify: FastifyInstance) {
  const adminAuthService = new AdminAuthService(fastify.prisma);

  // Login
  fastify.post<{
    Body: { email: string; password: string };
  }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Email and password are required',
      });
    }

    try {
      const admin = await adminAuthService.login(email, password);

      // Generate admin JWT with different claim to distinguish from clinic users
      // Use empty strings for clinic user fields since this is an admin token
      const accessToken = fastify.jwt.sign(
        {
          userId: '',
          clinicId: '',
          role: 'ADMIN' as const,
          adminId: admin.id,
          type: 'super_admin' as const,
        },
        { expiresIn: '4h' }
      );

      const refreshToken = fastify.jwt.sign(
        {
          userId: '',
          clinicId: '',
          role: 'ADMIN' as const,
          adminId: admin.id,
          type: 'super_admin_refresh' as const,
        },
        { expiresIn: '7d' }
      );

      return reply.send({
        success: true,
        admin,
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid credentials',
      });
    }
  });

  // Refresh token
  fastify.post<{
    Body: { refreshToken: string };
  }>('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: 'Refresh token is required',
      });
    }

    try {
      const decoded = fastify.jwt.verify(refreshToken) as {
        adminId: string;
        type: string;
      };

      if (decoded.type !== 'super_admin_refresh') {
        throw new Error('Invalid token type');
      }

      const admin = await adminAuthService.getAdmin(decoded.adminId);
      if (!admin || !admin.isActive) {
        throw new Error('Admin not found or inactive');
      }

      const newAccessToken = fastify.jwt.sign(
        {
          userId: '',
          clinicId: '',
          role: 'ADMIN' as const,
          adminId: admin.id,
          type: 'super_admin' as const,
        },
        { expiresIn: '4h' }
      );

      return reply.send({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }
  });

  // Get current admin
  fastify.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as { adminId?: string; type?: string };

      if (decoded.type !== 'super_admin' || !decoded.adminId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const admin = await adminAuthService.getAdmin(decoded.adminId);
      if (!admin) {
        return reply.status(404).send({
          success: false,
          error: 'Admin not found',
        });
      }

      return reply.send({ success: true, admin });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }
  });
}
