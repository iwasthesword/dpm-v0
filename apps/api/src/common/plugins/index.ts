import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { prismaPlugin } from './prisma.js';
import { redisPlugin } from './redis.js';

export async function registerPlugins(fastify: FastifyInstance) {
  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // Rate limiting - higher limit for development
  if (process.env.NODE_ENV === 'production') {
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  } else {
    await fastify.register(rateLimit, {
      max: 1000,
      timeWindow: '1 minute',
    });
  }

  // Utilities
  await fastify.register(sensible);
  await fastify.register(cookie);

  // File uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    sign: {
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    },
  });

  // Database
  await fastify.register(prismaPlugin);

  // Cache
  await fastify.register(redisPlugin);

  // API Documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'DPM API',
        description: 'Dental Practice Management API',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3001}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  });
}
