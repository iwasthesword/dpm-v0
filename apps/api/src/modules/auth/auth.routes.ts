import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  enable2FASchema,
  verify2FASchema,
  changePasswordSchema,
} from './auth.schema.js';
import { authenticate } from '../../common/middleware/authenticate.js';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma, fastify);
  const authController = new AuthController(authService);

  // Public routes
  fastify.post('/login', {
    schema: {
      description: 'Authenticate user with email and password',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          rememberMe: { type: 'boolean' },
        },
      },
    },
    preHandler: async (request) => {
      const result = loginSchema.safeParse(request.body);
      if (!result.success) {
        throw fastify.httpErrors.badRequest(result.error.errors[0].message);
      }
    },
    handler: (request, reply) => authController.login(request as any, reply),
  });

  fastify.post('/2fa/verify', {
    schema: {
      description: 'Verify 2FA code during login',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['userId', 'code'],
        properties: {
          userId: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
    handler: (request, reply) => authController.verify2FA(request as any, reply),
  });

  fastify.post('/register', {
    schema: {
      description: 'Register a new user (admin only)',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['clinicId', 'email', 'password', 'name', 'role'],
        properties: {
          clinicId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          role: { type: 'string', enum: ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ASSISTANT', 'FINANCIAL'] },
        },
      },
    },
    preHandler: async (request) => {
      const result = registerSchema.safeParse(request.body);
      if (!result.success) {
        throw fastify.httpErrors.badRequest(result.error.errors[0].message);
      }
    },
    handler: (request, reply) => authController.register(request as any, reply),
  });

  fastify.post('/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    preHandler: async (request) => {
      const result = refreshTokenSchema.safeParse(request.body);
      if (!result.success) {
        throw fastify.httpErrors.badRequest(result.error.errors[0].message);
      }
    },
    handler: (request, reply) => authController.refreshToken(request as any, reply),
  });

  fastify.post('/forgot-password', {
    schema: {
      description: 'Request password reset email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    preHandler: async (request) => {
      const result = forgotPasswordSchema.safeParse(request.body);
      if (!result.success) {
        throw fastify.httpErrors.badRequest(result.error.errors[0].message);
      }
    },
    handler: (request, reply) => authController.forgotPassword(request as any, reply),
  });

  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password using token from email',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
    preHandler: async (request) => {
      const result = resetPasswordSchema.safeParse(request.body);
      if (!result.success) {
        throw fastify.httpErrors.badRequest(result.error.errors[0].message);
      }
    },
    handler: (request, reply) => authController.resetPassword(request as any, reply),
  });

  // Protected routes
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', authenticate);

    protectedRoutes.post('/logout', {
      schema: {
        description: 'Logout from current session',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
      },
      handler: (request, reply) => authController.logout(request, reply),
    });

    protectedRoutes.post('/logout-all', {
      schema: {
        description: 'Logout from all sessions',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
      },
      handler: (request, reply) => authController.logoutAll(request, reply),
    });

    protectedRoutes.get('/me', {
      schema: {
        description: 'Get current user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
      },
      handler: (request, reply) => authController.me(request, reply),
    });

    protectedRoutes.post('/change-password', {
      schema: {
        description: 'Change current user password',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
      preHandler: async (request) => {
        const result = changePasswordSchema.safeParse(request.body);
        if (!result.success) {
          throw fastify.httpErrors.badRequest(result.error.errors[0].message);
        }
      },
      handler: (request, reply) => authController.changePassword(request as any, reply),
    });

    protectedRoutes.post('/2fa/enable', {
      schema: {
        description: 'Start 2FA setup process',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string' },
          },
        },
      },
      preHandler: async (request) => {
        const result = enable2FASchema.safeParse(request.body);
        if (!result.success) {
          throw fastify.httpErrors.badRequest(result.error.errors[0].message);
        }
      },
      handler: (request, reply) => authController.enable2FA(request as any, reply),
    });

    protectedRoutes.post('/2fa/confirm', {
      schema: {
        description: 'Confirm 2FA setup with code from authenticator',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
      },
      preHandler: async (request) => {
        const result = verify2FASchema.safeParse(request.body);
        if (!result.success) {
          throw fastify.httpErrors.badRequest(result.error.errors[0].message);
        }
      },
      handler: (request, reply) => authController.confirm2FA(request as any, reply),
    });

    protectedRoutes.post('/2fa/disable', {
      schema: {
        description: 'Disable 2FA',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['password', 'code'],
          properties: {
            password: { type: 'string' },
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
      },
      handler: (request, reply) => authController.disable2FA(request as any, reply),
    });

    protectedRoutes.get('/sessions', {
      schema: {
        description: 'List active sessions',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
      },
      handler: (request, reply) => authController.getSessions(request, reply),
    });

    protectedRoutes.delete('/sessions/:id', {
      schema: {
        description: 'Revoke a specific session',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
      handler: (request, reply) => authController.revokeSession(request as any, reply),
    });
  });
}
