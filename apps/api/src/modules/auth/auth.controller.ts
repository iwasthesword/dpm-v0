import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import type {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  Enable2FAInput,
  Verify2FAInput,
  ChangePasswordInput,
} from './auth.schema.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ) {
    try {
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const result = await this.authService.login(request.body, ipAddress, userAgent);

      if (result.requires2FA) {
        return reply.status(200).send({
          success: true,
          requires2FA: true,
          userId: result.user.id,
          message: '2FA verification required',
        });
      }

      return reply.status(200).send({
        success: true,
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.status(401).send({
        success: false,
        error: message,
      });
    }
  }

  async verify2FA(
    request: FastifyRequest<{ Body: Verify2FAInput & { userId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { userId, code } = request.body;
      const tokens = await this.authService.verify2FA(userId, code);

      return reply.status(200).send({
        success: true,
        tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '2FA verification failed';
      return reply.status(401).send({
        success: false,
        error: message,
      });
    }
  }

  async register(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
  ) {
    try {
      const user = await this.authService.register(request.body);

      return reply.status(201).send({
        success: true,
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async refreshToken(
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply
  ) {
    try {
      const tokens = await this.authService.refreshToken(request.body.refreshToken);

      return reply.status(200).send({
        success: true,
        tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      return reply.status(401).send({
        success: false,
        error: message,
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      await this.authService.logout(request.user.userId, token);

      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async logoutAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      await this.authService.logout(request.user.userId);

      return reply.status(200).send({
        success: true,
        message: 'Logged out from all sessions',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async forgotPassword(
    request: FastifyRequest<{ Body: ForgotPasswordInput }>,
    reply: FastifyReply
  ) {
    try {
      await this.authService.forgotPassword(request.body);

      // Always return success to prevent email enumeration
      return reply.status(200).send({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent',
      });
    } catch (error) {
      return reply.status(200).send({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent',
      });
    }
  }

  async resetPassword(
    request: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply
  ) {
    try {
      await this.authService.resetPassword(request.body);

      return reply.status(200).send({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async changePassword(
    request: FastifyRequest<{ Body: ChangePasswordInput }>,
    reply: FastifyReply
  ) {
    try {
      await this.authService.changePassword(request.user.userId, request.body);

      return reply.status(200).send({
        success: true,
        message: 'Password changed successfully. Please login again',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async enable2FA(
    request: FastifyRequest<{ Body: Enable2FAInput }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.authService.enable2FA(
        request.user.userId,
        request.body.password
      );

      return reply.status(200).send({
        success: true,
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        message: 'Scan the QR code with your authenticator app, then confirm with a code',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '2FA setup failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async confirm2FA(
    request: FastifyRequest<{ Body: Verify2FAInput }>,
    reply: FastifyReply
  ) {
    try {
      await this.authService.confirm2FA(request.user.userId, request.body.code);

      return reply.status(200).send({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '2FA confirmation failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async disable2FA(
    request: FastifyRequest<{ Body: Enable2FAInput & Verify2FAInput }>,
    reply: FastifyReply
  ) {
    try {
      await this.authService.disable2FA(
        request.user.userId,
        request.body.password,
        request.body.code
      );

      return reply.status(200).send({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '2FA disable failed';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const currentToken = request.headers.authorization?.replace('Bearer ', '');
      const sessions = await this.authService.getSessions(request.user.userId);

      // Mark current session
      const sessionsWithCurrent = sessions.map((session) => ({
        ...session,
        // We can't easily determine current session without storing token hash
        // For now, we'll rely on createdAt to show most recent
      }));

      return reply.status(200).send({
        success: true,
        sessions: sessionsWithCurrent,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get sessions';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async revokeSession(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await this.authService.revokeSession(request.user.userId, request.params.id);

      return reply.status(200).send({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke session';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = await request.server.prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          clinicId: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          clinic: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              logo: true,
            },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }

      return reply.status(200).send({
        success: true,
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user';
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  }
}
