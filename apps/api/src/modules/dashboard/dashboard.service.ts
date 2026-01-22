import type { PrismaClient } from '@prisma/client';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface BusinessHealth {
  status: HealthStatus;
  netProfit: number;
  averageTicket: number;
  noShowRate: number;
  conversionRate: number;
  scheduleCapacity: number;
}

export interface ScheduleHealth {
  status: HealthStatus;
  todayOccupancy: number;
  tomorrowOccupancy: number;
  idleHours: number;
  underutilizedProfessionals: { id: string; name: string; occupancy: number }[];
}

export interface CashHealth {
  status: HealthStatus;
  netIncome: number;
  expenses: number;
  projectedBalance: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface MarketingHealth {
  status: HealthStatus;
  newPatientsThisMonth: number;
  newPatientsPreviousMonth: number;
  patientSources: { source: string; count: number }[];
  marketingExpenses: number;
}

export interface DashboardHealth {
  businessHealth: BusinessHealth;
  scheduleHealth: ScheduleHealth;
  cashHealth: CashHealth;
  marketingHealth: MarketingHealth;
}

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  async getHealthMetrics(clinicId: string): Promise<DashboardHealth> {
    const [businessHealth, scheduleHealth, cashHealth, marketingHealth] = await Promise.all([
      this.calculateBusinessHealth(clinicId),
      this.calculateScheduleHealth(clinicId),
      this.calculateCashHealth(clinicId),
      this.calculateMarketingHealth(clinicId),
    ]);

    return {
      businessHealth,
      scheduleHealth,
      cashHealth,
      marketingHealth,
    };
  }

  private async calculateBusinessHealth(clinicId: string): Promise<BusinessHealth> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Get appointment stats for this month
    const [totalAppointments, noShowAppointments, completedAppointments] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          clinicId,
          startTime: { gte: startOfMonth, lte: endOfMonth },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          startTime: { gte: startOfMonth, lte: endOfMonth },
          status: 'NO_SHOW',
        },
      }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          startTime: { gte: startOfMonth, lte: endOfMonth },
          status: 'COMPLETED',
        },
      }),
    ]);

    // Get treatment plan conversion rate
    const [totalPlans, approvedPlans] = await Promise.all([
      this.prisma.treatmentPlan.count({
        where: {
          clinicId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { notIn: ['DRAFT'] },
        },
      }),
      this.prisma.treatmentPlan.count({
        where: {
          clinicId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] },
        },
      }),
    ]);

    // Get financial data for profit and average ticket
    const [incomeTransactions, expenseTransactions] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          clinicId,
          type: 'INCOME',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          clinicId,
          type: 'EXPENSE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeTransactions._sum.amount || 0);
    const expenses = Number(expenseTransactions._sum.amount || 0);
    const netProfit = income - expenses;
    const averageTicket = completedAppointments > 0 ? income / completedAppointments : 0;

    const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;
    const conversionRate = totalPlans > 0 ? (approvedPlans / totalPlans) * 100 : 100;

    // Calculate schedule capacity (occupied vs available slots)
    const scheduleCapacity = await this.calculateMonthlyCapacity(clinicId, startOfMonth, endOfMonth);

    // Determine status
    let status: HealthStatus = 'healthy';
    if (noShowRate > 20 || conversionRate < 40 || scheduleCapacity < 50) {
      status = 'critical';
    } else if (noShowRate > 10 || conversionRate < 60 || scheduleCapacity < 70) {
      status = 'warning';
    }

    return {
      status,
      netProfit,
      averageTicket,
      noShowRate,
      conversionRate,
      scheduleCapacity,
    };
  }

  private async calculateScheduleHealth(clinicId: string): Promise<ScheduleHealth> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Get professionals for this clinic
    const professionals = await this.prisma.professional.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true, workingHours: true },
    });

    // Get today's and tomorrow's appointments
    const [todayAppointments, tomorrowAppointments] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          clinicId,
          startTime: { gte: today, lt: tomorrow },
          status: { notIn: ['CANCELLED'] },
        },
        select: { professionalId: true, startTime: true, endTime: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          clinicId,
          startTime: { gte: tomorrow, lt: dayAfterTomorrow },
          status: { notIn: ['CANCELLED'] },
        },
        select: { professionalId: true, startTime: true, endTime: true },
      }),
    ]);

    // Calculate occupancy assuming 8 working hours per day (8am-6pm = 10 hours)
    const workingHoursPerDay = 10;
    const totalPossibleHours = professionals.length * workingHoursPerDay;

    const todayBookedHours = todayAppointments.reduce((acc, apt) => {
      const duration = (new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime()) / (1000 * 60 * 60);
      return acc + duration;
    }, 0);

    const tomorrowBookedHours = tomorrowAppointments.reduce((acc, apt) => {
      const duration = (new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime()) / (1000 * 60 * 60);
      return acc + duration;
    }, 0);

    const todayOccupancy = totalPossibleHours > 0 ? (todayBookedHours / totalPossibleHours) * 100 : 0;
    const tomorrowOccupancy = totalPossibleHours > 0 ? (tomorrowBookedHours / totalPossibleHours) * 100 : 0;
    const idleHours = Math.max(0, totalPossibleHours - todayBookedHours);

    // Find underutilized professionals
    const professionalOccupancy = professionals.map((prof) => {
      const profAppointments = todayAppointments.filter((apt) => apt.professionalId === prof.id);
      const bookedHours = profAppointments.reduce((acc, apt) => {
        const duration = (new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime()) / (1000 * 60 * 60);
        return acc + duration;
      }, 0);
      const occupancy = (bookedHours / workingHoursPerDay) * 100;
      return { id: prof.id, name: prof.name, occupancy };
    });

    const underutilizedProfessionals = professionalOccupancy.filter((p) => p.occupancy < 50);

    // Determine status
    let status: HealthStatus = 'healthy';
    if (todayOccupancy < 60 || idleHours > 4) {
      status = 'critical';
    } else if (todayOccupancy < 80 || idleHours > 2) {
      status = 'warning';
    }

    return {
      status,
      todayOccupancy,
      tomorrowOccupancy,
      idleHours,
      underutilizedProfessionals,
    };
  }

  private async calculateCashHealth(clinicId: string): Promise<CashHealth> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Get income and expenses for this month
    const [incomeTransactions, expenseTransactions] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          clinicId,
          type: 'INCOME',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          clinicId,
          type: 'EXPENSE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    // Get overdue payments
    const overduePayments = await this.prisma.payment.findMany({
      where: {
        clinicId,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: today },
      },
      select: { amount: true, paidAmount: true },
    });

    const overdueCount = overduePayments.length;
    const overdueAmount = overduePayments.reduce(
      (acc, p) => acc + (Number(p.amount) - Number(p.paidAmount)),
      0
    );

    // Get pending payments (for projected balance)
    const pendingPayments = await this.prisma.payment.aggregate({
      where: {
        clinicId,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { gte: today, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    const netIncome = Number(incomeTransactions._sum.amount || 0);
    const expenses = Number(expenseTransactions._sum.amount || 0);
    const pendingIncome = Number(pendingPayments._sum.amount || 0);
    const projectedBalance = netIncome - expenses + pendingIncome;

    // Determine status
    let status: HealthStatus = 'healthy';
    if (projectedBalance < 0 || overdueCount > 3) {
      status = 'critical';
    } else if (overdueCount > 0) {
      status = 'warning';
    }

    return {
      status,
      netIncome,
      expenses,
      projectedBalance,
      overdueAmount,
      overdueCount,
    };
  }

  private async calculateMarketingHealth(clinicId: string): Promise<MarketingHealth> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Get new patients this month and previous month
    const [newPatientsThisMonth, newPatientsPreviousMonth] = await Promise.all([
      this.prisma.patient.count({
        where: {
          clinicId,
          isActive: true,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.patient.count({
        where: {
          clinicId,
          isActive: true,
          createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
      }),
    ]);

    // Get patient sources breakdown
    const patientsWithSource = await this.prisma.patient.groupBy({
      by: ['source'],
      where: {
        clinicId,
        isActive: true,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _count: { source: true },
    });

    const patientSources = patientsWithSource.map((p) => ({
      source: p.source || 'unknown',
      count: p._count.source,
    }));

    // Get marketing expenses
    const marketingExpensesResult = await this.prisma.transaction.aggregate({
      where: {
        clinicId,
        type: 'EXPENSE',
        category: 'marketing',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    const marketingExpenses = Number(marketingExpensesResult._sum.amount || 0);

    // Determine status
    let status: HealthStatus = 'healthy';
    const changeRate = newPatientsPreviousMonth > 0
      ? ((newPatientsThisMonth - newPatientsPreviousMonth) / newPatientsPreviousMonth) * 100
      : newPatientsThisMonth > 0 ? 100 : 0;

    if (changeRate < -10) {
      status = 'critical';
    } else if (changeRate < 10 && changeRate >= -10) {
      status = 'warning';
    }

    return {
      status,
      newPatientsThisMonth,
      newPatientsPreviousMonth,
      patientSources,
      marketingExpenses,
    };
  }

  private async calculateMonthlyCapacity(
    clinicId: string,
    startOfMonth: Date,
    endOfMonth: Date
  ): Promise<number> {
    // Get total appointments for the month
    const appointments = await this.prisma.appointment.count({
      where: {
        clinicId,
        startTime: { gte: startOfMonth, lte: endOfMonth },
        status: { notIn: ['CANCELLED'] },
      },
    });

    // Get number of professionals
    const professionalCount = await this.prisma.professional.count({
      where: { clinicId, isActive: true },
    });

    // Assume each professional can handle ~8 appointments per day, 22 working days per month
    const maxCapacity = professionalCount * 8 * 22;

    if (maxCapacity === 0) return 0;
    return Math.min(100, (appointments / maxCapacity) * 100);
  }
}
