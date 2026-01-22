import type { PrismaClient, Professional, CommissionType } from '@prisma/client';

export interface NetProfitSummary {
  grossIncome: number;
  totalExpenses: number;
  totalCommissions: number;
  netProfit: number;
  profitMargin: number;
  comparison: {
    previousGrossIncome: number;
    previousExpenses: number;
    previousNetProfit: number;
    incomeChange: number;
    expenseChange: number;
    profitChange: number;
  };
  breakdown: {
    incomeByCategory: { category: string; amount: number }[];
    expensesByCategory: { category: string; amount: number }[];
    commissionsByProfessional: { professionalId: string; name: string; amount: number }[];
  };
}

export interface AgingBucket {
  amount: number;
  count: number;
}

export interface PatientReceivable {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalOwed: number;
  oldestDue: Date;
  agingBucket: 'current' | '30' | '60' | '90+';
  payments: {
    id: string;
    description: string;
    amount: number;
    paidAmount: number;
    dueDate: Date;
    status: string;
  }[];
}

export interface AccountsReceivable {
  totalReceivable: number;
  patientsCount: number;
  aging: {
    current: AgingBucket;
    thirtyDays: AgingBucket;
    sixtyDays: AgingBucket;
    ninetyPlus: AgingBucket;
  };
  patients: PatientReceivable[];
}

export interface ProfessionalCommission {
  id: string;
  name: string;
  commissionType: CommissionType;
  commissionValue: number;
  totalRevenue: number;
  totalCommission: number;
  appointmentCount: number;
}

export interface CommissionsSummary {
  period: { startDate: string; endDate: string };
  totalCommissions: number;
  totalRevenue: number;
  professionals: ProfessionalCommission[];
}

export interface RevenueByProfessional {
  id: string;
  name: string;
  appointmentCount: number;
  completedCount: number;
  revenue: number;
  averageTicket: number;
}

export interface RevenueByProcedure {
  id: string;
  name: string;
  code: string | null;
  count: number;
  revenue: number;
  averagePrice: number;
}

export interface ProfitLossStatement {
  period: { startDate: string; endDate: string };
  revenue: {
    treatments: number;
    consultations: number;
    other: number;
    total: number;
  };
  expenses: {
    salaries: number;
    rent: number;
    supplies: number;
    utilities: number;
    marketing: number;
    commissions: number;
    other: number;
    total: number;
  };
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export class FinancialService {
  constructor(private prisma: PrismaClient) {}

  async getNetProfitSummary(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<NetProfitSummary> {
    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = new Date(startDate.getTime() - 1);

    // Get current period data
    const [currentIncome, currentExpenses, previousIncome, previousExpenses] = await Promise.all([
      this.getIncomeByCategory(clinicId, startDate, endDate),
      this.getExpensesByCategory(clinicId, startDate, endDate),
      this.getIncomeByCategory(clinicId, previousStart, previousEnd),
      this.getExpensesByCategory(clinicId, previousStart, previousEnd),
    ]);

    // Calculate commissions
    const commissions = await this.calculateCommissionsForPeriod(clinicId, startDate, endDate);

    const grossIncome = currentIncome.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = currentExpenses.reduce((sum, c) => sum + c.amount, 0);
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
    const netProfit = grossIncome - totalExpenses - totalCommissions;
    const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;

    const previousGrossIncome = previousIncome.reduce((sum, c) => sum + c.amount, 0);
    const previousTotalExpenses = previousExpenses.reduce((sum, c) => sum + c.amount, 0);
    const previousNetProfit = previousGrossIncome - previousTotalExpenses;

    return {
      grossIncome,
      totalExpenses,
      totalCommissions,
      netProfit,
      profitMargin,
      comparison: {
        previousGrossIncome,
        previousExpenses: previousTotalExpenses,
        previousNetProfit,
        incomeChange: previousGrossIncome > 0
          ? ((grossIncome - previousGrossIncome) / previousGrossIncome) * 100
          : grossIncome > 0 ? 100 : 0,
        expenseChange: previousTotalExpenses > 0
          ? ((totalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
          : totalExpenses > 0 ? 100 : 0,
        profitChange: previousNetProfit !== 0
          ? ((netProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100
          : netProfit > 0 ? 100 : 0,
      },
      breakdown: {
        incomeByCategory: currentIncome,
        expensesByCategory: currentExpenses,
        commissionsByProfessional: commissions,
      },
    };
  }

  async getAccountsReceivable(clinicId: string): Promise<AccountsReceivable> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get all pending/partially paid payments
    const payments = await this.prisma.payment.findMany({
      where: {
        clinicId,
        status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Group by patient and calculate aging
    const patientMap = new Map<string, PatientReceivable>();
    const aging = {
      current: { amount: 0, count: 0 },
      thirtyDays: { amount: 0, count: 0 },
      sixtyDays: { amount: 0, count: 0 },
      ninetyPlus: { amount: 0, count: 0 },
    };

    for (const payment of payments) {
      const owed = Number(payment.amount) - Number(payment.paidAmount);
      if (owed <= 0) continue;

      const dueDate = new Date(payment.dueDate);
      let bucket: 'current' | '30' | '60' | '90+';

      if (dueDate >= thirtyDaysAgo) {
        bucket = 'current';
        aging.current.amount += owed;
        aging.current.count++;
      } else if (dueDate >= sixtyDaysAgo) {
        bucket = '30';
        aging.thirtyDays.amount += owed;
        aging.thirtyDays.count++;
      } else if (dueDate >= ninetyDaysAgo) {
        bucket = '60';
        aging.sixtyDays.amount += owed;
        aging.sixtyDays.count++;
      } else {
        bucket = '90+';
        aging.ninetyPlus.amount += owed;
        aging.ninetyPlus.count++;
      }

      const patientId = payment.patient.id;
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          id: patientId,
          name: payment.patient.name,
          phone: payment.patient.phone,
          email: payment.patient.email,
          totalOwed: 0,
          oldestDue: dueDate,
          agingBucket: bucket,
          payments: [],
        });
      }

      const patientData = patientMap.get(patientId)!;
      patientData.totalOwed += owed;
      if (dueDate < patientData.oldestDue) {
        patientData.oldestDue = dueDate;
        patientData.agingBucket = bucket;
      }
      patientData.payments.push({
        id: payment.id,
        description: payment.description,
        amount: Number(payment.amount),
        paidAmount: Number(payment.paidAmount),
        dueDate: payment.dueDate,
        status: payment.status,
      });
    }

    const patients = Array.from(patientMap.values()).sort((a, b) => b.totalOwed - a.totalOwed);
    const totalReceivable = patients.reduce((sum, p) => sum + p.totalOwed, 0);

    return {
      totalReceivable,
      patientsCount: patients.length,
      aging,
      patients,
    };
  }

  async getCommissionsSummary(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    professionalId?: string
  ): Promise<CommissionsSummary> {
    // Get professionals
    const professionalWhere: any = { clinicId, isActive: true };
    if (professionalId) professionalWhere.id = professionalId;

    const professionals = await this.prisma.professional.findMany({
      where: professionalWhere,
      select: {
        id: true,
        name: true,
        commissionType: true,
        commissionValue: true,
        commissionTable: true,
      },
    });

    // Get completed appointments with revenue for each professional
    const profCommissions: ProfessionalCommission[] = [];
    let totalCommissions = 0;
    let totalRevenue = 0;

    for (const prof of professionals) {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          clinicId,
          professionalId: prof.id,
          startTime: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        include: {
          procedure: { select: { id: true, name: true, price: true } },
        },
      });

      let profRevenue = 0;
      let profCommission = 0;

      for (const apt of appointments) {
        const procedurePrice = apt.procedure ? Number(apt.procedure.price) : 0;
        profRevenue += procedurePrice;

        // Calculate commission based on type
        const commission = this.calculateCommission(
          prof as Professional,
          procedurePrice,
          apt.procedure ? [apt.procedure] : []
        );
        profCommission += commission;
      }

      profCommissions.push({
        id: prof.id,
        name: prof.name,
        commissionType: prof.commissionType || 'PERCENTAGE',
        commissionValue: Number(prof.commissionValue) || 0,
        totalRevenue: profRevenue,
        totalCommission: profCommission,
        appointmentCount: appointments.length,
      });

      totalCommissions += profCommission;
      totalRevenue += profRevenue;
    }

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalCommissions,
      totalRevenue,
      professionals: profCommissions.sort((a, b) => b.totalCommission - a.totalCommission),
    };
  }

  async getRevenueByProfessional(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueByProfessional[]> {
    const professionals = await this.prisma.professional.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true },
    });

    const result: RevenueByProfessional[] = [];

    for (const prof of professionals) {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          clinicId,
          professionalId: prof.id,
          startTime: { gte: startDate, lte: endDate },
          status: { notIn: ['CANCELLED'] },
        },
        include: {
          procedure: { select: { price: true } },
        },
      });

      const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');
      const revenue = completedAppointments.reduce(
        (sum, apt) => sum + (apt.procedure ? Number(apt.procedure.price) : 0),
        0
      );

      result.push({
        id: prof.id,
        name: prof.name,
        appointmentCount: appointments.length,
        completedCount: completedAppointments.length,
        revenue,
        averageTicket: completedAppointments.length > 0
          ? revenue / completedAppointments.length
          : 0,
      });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
  }

  async getRevenueByProcedure(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueByProcedure[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        startTime: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
        procedureId: { not: null },
      },
      include: {
        procedure: { select: { id: true, name: true, code: true, price: true } },
      },
    });

    const procedureMap = new Map<string, RevenueByProcedure>();

    for (const apt of appointments) {
      if (!apt.procedure) continue;

      const procId = apt.procedure.id;
      if (!procedureMap.has(procId)) {
        procedureMap.set(procId, {
          id: procId,
          name: apt.procedure.name,
          code: apt.procedure.code,
          count: 0,
          revenue: 0,
          averagePrice: 0,
        });
      }

      const proc = procedureMap.get(procId)!;
      proc.count++;
      proc.revenue += Number(apt.procedure.price);
    }

    const result = Array.from(procedureMap.values()).map((p) => ({
      ...p,
      averagePrice: p.count > 0 ? p.revenue / p.count : 0,
    }));

    return result.sort((a, b) => b.revenue - a.revenue);
  }

  async getProfitLossStatement(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProfitLossStatement> {
    // Get income by category
    const incomeData = await this.getIncomeByCategory(clinicId, startDate, endDate);
    const expenseData = await this.getExpensesByCategory(clinicId, startDate, endDate);

    // Get commissions total
    const commissions = await this.calculateCommissionsForPeriod(clinicId, startDate, endDate);
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);

    // Map income categories
    const revenue = {
      treatments: 0,
      consultations: 0,
      other: 0,
      total: 0,
    };

    for (const inc of incomeData) {
      if (inc.category === 'treatment') {
        revenue.treatments += inc.amount;
      } else if (inc.category === 'consultation') {
        revenue.consultations += inc.amount;
      } else {
        revenue.other += inc.amount;
      }
      revenue.total += inc.amount;
    }

    // Map expense categories
    const expenses = {
      salaries: 0,
      rent: 0,
      supplies: 0,
      utilities: 0,
      marketing: 0,
      commissions: totalCommissions,
      other: 0,
      total: totalCommissions,
    };

    for (const exp of expenseData) {
      switch (exp.category) {
        case 'salary':
          expenses.salaries += exp.amount;
          break;
        case 'rent':
          expenses.rent += exp.amount;
          break;
        case 'supplies':
          expenses.supplies += exp.amount;
          break;
        case 'utilities':
          expenses.utilities += exp.amount;
          break;
        case 'marketing':
          expenses.marketing += exp.amount;
          break;
        default:
          expenses.other += exp.amount;
      }
      expenses.total += exp.amount;
    }

    const grossProfit = revenue.total;
    const netProfit = grossProfit - expenses.total;
    const profitMargin = revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      revenue,
      expenses,
      grossProfit,
      netProfit,
      profitMargin,
    };
  }

  // Helper methods

  private async getIncomeByCategory(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ category: string; amount: number }[]> {
    const transactions = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        clinicId,
        type: 'INCOME',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return transactions.map((t) => ({
      category: t.category,
      amount: Number(t._sum.amount) || 0,
    }));
  }

  private async getExpensesByCategory(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ category: string; amount: number }[]> {
    const transactions = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        clinicId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return transactions.map((t) => ({
      category: t.category,
      amount: Number(t._sum.amount) || 0,
    }));
  }

  private async calculateCommissionsForPeriod(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ professionalId: string; name: string; amount: number }[]> {
    const professionals = await this.prisma.professional.findMany({
      where: { clinicId, isActive: true },
      select: {
        id: true,
        name: true,
        commissionType: true,
        commissionValue: true,
        commissionTable: true,
      },
    });

    const result: { professionalId: string; name: string; amount: number }[] = [];

    for (const prof of professionals) {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          clinicId,
          professionalId: prof.id,
          startTime: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        include: {
          procedure: { select: { id: true, price: true } },
        },
      });

      let totalCommission = 0;
      for (const apt of appointments) {
        const revenue = apt.procedure ? Number(apt.procedure.price) : 0;
        totalCommission += this.calculateCommission(
          prof as Professional,
          revenue,
          apt.procedure ? [apt.procedure] : []
        );
      }

      if (totalCommission > 0) {
        result.push({
          professionalId: prof.id,
          name: prof.name,
          amount: totalCommission,
        });
      }
    }

    return result;
  }

  private calculateCommission(
    professional: Professional,
    revenue: number,
    procedures: { id: string; price?: any }[]
  ): number {
    if (!professional.commissionType || !professional.commissionValue) {
      return 0;
    }

    if (professional.commissionType === 'PERCENTAGE') {
      return revenue * (Number(professional.commissionValue) / 100);
    } else if (professional.commissionType === 'FIXED') {
      return Number(professional.commissionValue);
    } else if (professional.commissionType === 'PER_PROCEDURE') {
      const table = professional.commissionTable as Record<string, number> | null;
      return procedures.reduce((sum, proc) => {
        return sum + (table?.[proc.id] ?? Number(professional.commissionValue));
      }, 0);
    }

    return 0;
  }
}
