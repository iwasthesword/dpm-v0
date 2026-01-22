import type { UserRole } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

// JWT payload supporting both clinic users and super admins
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      clinicId: string;
      role: UserRole;
      type?: string;
      adminId?: string;
    };
    user: {
      userId: string;
      clinicId: string;
      role: UserRole;
      type?: string;
      adminId?: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: PrismaClient;
    redis: import('ioredis').Redis;
  }
}
