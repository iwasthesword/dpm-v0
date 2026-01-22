import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';
import speakeasy from 'speakeasy';
import type { FastifyInstance } from 'fastify';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './auth.schema.js';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ACCESS_TOKEN_EXPIRATION = '15m';
const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
const PASSWORD_RESET_EXPIRATION_HOURS = 1;

export interface TokenPayload {
  userId: string;
  clinicId: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithoutPassword {
  id: string;
  clinicId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private fastify: FastifyInstance
  ) {}

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<{
    user: UserWithoutPassword;
    tokens?: AuthTokens;
    requires2FA?: boolean;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60
      );
      throw new Error(`Account locked. Try again in ${minutesRemaining} minutes`);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new Error('Invalid email or password');
    }

    // Reset failed attempts on successful password verification
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const userWithoutPassword = this.sanitizeUser(user);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Store temporary session for 2FA verification
      await this.fastify.redis.set(
        `2fa:pending:${user.id}`,
        JSON.stringify({ ipAddress, userAgent }),
        'EX',
        300 // 5 minutes to complete 2FA
      );
      return { user: userWithoutPassword, requires2FA: true };
    }

    // Generate tokens and create session
    const tokens = await this.createSession(user, ipAddress, userAgent);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { user: userWithoutPassword, tokens };
  }

  async verify2FA(userId: string, code: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA verification failed');
    }

    // Check pending 2FA session
    const pendingSession = await this.fastify.redis.get(`2fa:pending:${userId}`);
    if (!pendingSession) {
      throw new Error('2FA session expired. Please login again');
    }

    const { ipAddress, userAgent } = JSON.parse(pendingSession);

    // Verify TOTP code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // Allow 1 step tolerance
    });

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    // Clear pending session
    await this.fastify.redis.del(`2fa:pending:${userId}`);

    // Create session and update last login
    const tokens = await this.createSession(user, ipAddress, userAgent);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return tokens;
  }

  async register(input: RegisterInput): Promise<UserWithoutPassword> {
    // Check if email already exists in clinic
    const existingUser = await this.prisma.user.findFirst({
      where: {
        clinicId: input.clinicId,
        email: input.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new Error('Email already registered in this clinic');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        clinicId: input.clinicId,
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: input.role as UserRole,
      },
    });

    return this.sanitizeUser(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Find session by refresh token
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new Error('Refresh token expired');
    }

    if (!session.user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Generate new tokens
    const tokens = this.generateTokens({
      userId: session.user.id,
      clinicId: session.user.clinicId,
      role: session.user.role,
    });

    // Update session with new tokens
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(userId: string, token?: string): Promise<void> {
    if (token) {
      // Revoke specific session
      await this.prisma.session.deleteMany({
        where: { userId, token },
      });
    } else {
      // Revoke all sessions
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate reset token
    const token = createId();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_HOURS * 60 * 60 * 1000);

    // Invalidate any existing reset tokens
    await this.prisma.passwordReset.updateMany({
      where: { email: input.email.toLowerCase(), usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new reset token
    await this.prisma.passwordReset.create({
      data: {
        email: input.email.toLowerCase(),
        token,
        expiresAt,
      },
    });

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordReset(user.email, token);
    console.log(`Password reset token for ${input.email}: ${token}`);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: input.token },
    });

    if (!resetRecord) {
      throw new Error('Invalid reset token');
    }

    if (resetRecord.usedAt) {
      throw new Error('Reset token already used');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new Error('Reset token expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Update user password
    await this.prisma.user.updateMany({
      where: { email: resetRecord.email },
      data: { passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all sessions for this user
    const user = await this.prisma.user.findFirst({
      where: { email: resetRecord.email },
    });
    if (user) {
      await this.prisma.session.deleteMany({
        where: { userId: user.id },
      });
    }
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all sessions except current (handled by controller)
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async enable2FA(userId: string, password: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clinic: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DPM:${user.clinic.name}:${user.email}`,
      length: 32,
    });

    // Store secret temporarily until confirmed
    await this.fastify.redis.set(
      `2fa:setup:${userId}`,
      secret.base32,
      'EX',
      600 // 10 minutes to complete setup
    );

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url || '',
    };
  }

  async confirm2FA(userId: string, code: string): Promise<void> {
    const secret = await this.fastify.redis.get(`2fa:setup:${userId}`);
    if (!secret) {
      throw new Error('2FA setup session expired. Please start again');
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });

    // Clear setup session
    await this.fastify.redis.del(`2fa:setup:${userId}`);
  }

  async disable2FA(userId: string, password: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }

    // Verify 2FA code
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!isValid) {
        throw new Error('Invalid 2FA code');
      }
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }

  async getSessions(userId: string): Promise<Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
  }>> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // Will be set by controller
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  // Private methods

  private async handleFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      // TODO: Send email notification about lockout
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  private async createSession(
    user: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const tokens = this.generateTokens({
      userId: user.id,
      clinicId: user.clinicId,
      role: user.role,
    });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = this.fastify.jwt.sign(payload);
    const refreshToken = createId() + createId(); // Long random string

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): UserWithoutPassword {
    return {
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
