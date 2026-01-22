import type { FastifyRequest, FastifyReply } from 'fastify';

interface SuperAdminJwtPayload {
  adminId?: string;
  type?: string;
}

/**
 * Middleware to verify super admin authentication.
 * Checks that the JWT token is valid and contains super admin credentials.
 */
export async function authenticateSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const decoded = request.user as SuperAdminJwtPayload;

    if (decoded.type !== 'super_admin' || !decoded.adminId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - Super admin access required',
      });
    }

    // Verify the admin exists and is active
    const admin = await request.server.prisma.superAdmin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - Admin account not found or inactive',
      });
    }

    // Attach admin info to request for use in route handlers
    (request as any).admin = admin;
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized - Invalid or expired token',
    });
  }
}

/**
 * Helper type for request with admin info attached.
 */
export interface AdminRequest extends FastifyRequest {
  admin: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
  };
}
