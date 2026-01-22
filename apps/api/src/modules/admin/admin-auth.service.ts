import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

export class AdminAuthService {
  constructor(private prisma: PrismaClient) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      throw new Error('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
  }

  async createAdmin(email: string, password: string, name: string) {
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await this.prisma.superAdmin.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
  }

  async getAdmin(adminId: string) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isActive: admin.isActive,
    };
  }
}
