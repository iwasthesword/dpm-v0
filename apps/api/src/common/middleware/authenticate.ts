import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '@prisma/client';
import '@/types/fastify.d.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
    });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (!roles.includes(request.user.role)) {
      reply.status(403).send({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
    }
  };
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  return requireRoles('ADMIN')(request, reply);
}
