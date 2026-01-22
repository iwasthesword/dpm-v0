import type { PrismaClient } from '@prisma/client';

export interface DailyRevenue {
  date: string;
  dayName: string;
  amount: number;
  appointmentCount: number;
  occupancyPercent: number;
}

export interface ProfessionalRevenue {
  id: string;
  name: string;
  amount: number;
  appointmentCount: number;
}

export interface ScheduleAlert {
  type: 'low_profit' | 'idle_schedule' | 'underutilized' | 'no_show_risk';
  message: string;
  severity: 'warning' | 'info';
  day?: string;
  professional?: string;
}

export interface FinancialSummary {
  totalExpectedRevenue: number;
  dailyRevenue: DailyRevenue[];
  professionalRevenue: ProfessionalRevenue[];
  alerts: ScheduleAlert[];
  averageTicket: number;
  comparisonWithLastWeek: number;
  appointmentCount: number;
}

export interface AppointmentRiskIndicators {
  noShowRisk: boolean;
  isPremium: boolean;
  isConfirmed: boolean;
}

export class ScheduleService {
  constructor(private prisma: PrismaClient) {}

  async getFinancialSummary(
    clinicId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialSummary> {
    // Get appointments for the period with procedure prices
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        startTime: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        procedure: { select: { id: true, name: true, price: true } },
        professional: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Get average procedure price for premium detection
    const avgPriceResult = await this.prisma.procedure.aggregate({
      where: { clinicId, isActive: true },
      _avg: { price: true },
    });
    const averageProcedurePrice = Number(avgPriceResult._avg.price || 150);

    // Calculate daily revenue
    const dailyRevenueMap = new Map<string, DailyRevenue>();
    const professionalRevenueMap = new Map<string, ProfessionalRevenue>();

    let totalExpectedRevenue = 0;
    const workingHoursPerDay = 10; // 8am-6pm

    // Get active professionals count for occupancy calculation
    const professionalCount = await this.prisma.professional.count({
      where: { clinicId, isActive: true },
    });
    const maxDailyAppointments = professionalCount * workingHoursPerDay;

    for (const apt of appointments) {
      const dateKey = apt.startTime.toISOString().split('T')[0];
      const price = apt.procedure ? Number(apt.procedure.price) : 0;
      totalExpectedRevenue += price;

      // Daily revenue
      if (!dailyRevenueMap.has(dateKey)) {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dailyRevenueMap.set(dateKey, {
          date: dateKey,
          dayName: dayNames[apt.startTime.getDay()],
          amount: 0,
          appointmentCount: 0,
          occupancyPercent: 0,
        });
      }
      const daily = dailyRevenueMap.get(dateKey)!;
      daily.amount += price;
      daily.appointmentCount += 1;

      // Professional revenue
      if (apt.professional) {
        if (!professionalRevenueMap.has(apt.professional.id)) {
          professionalRevenueMap.set(apt.professional.id, {
            id: apt.professional.id,
            name: apt.professional.name,
            amount: 0,
            appointmentCount: 0,
          });
        }
        const profRev = professionalRevenueMap.get(apt.professional.id)!;
        profRev.amount += price;
        profRev.appointmentCount += 1;
      }
    }

    // Calculate occupancy for each day
    for (const daily of dailyRevenueMap.values()) {
      daily.occupancyPercent = maxDailyAppointments > 0
        ? (daily.appointmentCount / maxDailyAppointments) * 100
        : 0;
    }

    const dailyRevenue = Array.from(dailyRevenueMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );
    const professionalRevenue = Array.from(professionalRevenueMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    // Calculate average ticket
    const averageTicket = appointments.length > 0
      ? totalExpectedRevenue / appointments.length
      : 0;

    // Get previous week data for comparison
    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(endDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const prevWeekAppointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        startTime: { gte: prevWeekStart, lte: prevWeekEnd },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        procedure: { select: { price: true } },
      },
    });

    const prevWeekRevenue = prevWeekAppointments.reduce(
      (sum, apt) => sum + (apt.procedure ? Number(apt.procedure.price) : 0),
      0
    );

    const comparisonWithLastWeek = prevWeekRevenue > 0
      ? ((totalExpectedRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : totalExpectedRevenue > 0 ? 100 : 0;

    // Generate alerts
    const alerts = await this.generateAlerts(
      clinicId,
      dailyRevenue,
      professionalRevenue,
      averageTicket,
      averageProcedurePrice
    );

    return {
      totalExpectedRevenue,
      dailyRevenue,
      professionalRevenue,
      alerts,
      averageTicket,
      comparisonWithLastWeek,
      appointmentCount: appointments.length,
    };
  }

  private async generateAlerts(
    clinicId: string,
    dailyRevenue: DailyRevenue[],
    professionalRevenue: ProfessionalRevenue[],
    averageTicket: number,
    averageProcedurePrice: number
  ): Promise<ScheduleAlert[]> {
    const alerts: ScheduleAlert[] = [];

    // High demand days (Mon, Tue, Wed)
    const highDemandDays = ['Seg', 'Ter', 'Qua'];

    for (const day of dailyRevenue) {
      // Full schedule, low profit
      if (day.occupancyPercent >= 80) {
        const dayAvgTicket = day.appointmentCount > 0
          ? day.amount / day.appointmentCount
          : 0;
        if (dayAvgTicket < averageProcedurePrice * 0.7) {
          alerts.push({
            type: 'low_profit',
            message: `${day.dayName} (${day.date.slice(5)}) com agenda cheia mas ticket baixo`,
            severity: 'warning',
            day: day.dayName,
          });
        }
      }

      // Idle schedule on high-demand day
      if (day.occupancyPercent < 50 && highDemandDays.includes(day.dayName)) {
        alerts.push({
          type: 'idle_schedule',
          message: `${day.dayName} (${day.date.slice(5)}) com agenda ociosa - considere promover`,
          severity: 'info',
          day: day.dayName,
        });
      }
    }

    // Check for underutilized professionals
    const avgAppointmentsPerProf = professionalRevenue.length > 0
      ? professionalRevenue.reduce((sum, p) => sum + p.appointmentCount, 0) / professionalRevenue.length
      : 0;

    for (const prof of professionalRevenue) {
      if (prof.appointmentCount < avgAppointmentsPerProf * 0.5 && avgAppointmentsPerProf > 2) {
        alerts.push({
          type: 'underutilized',
          message: `${prof.name} com poucos agendamentos esta semana`,
          severity: 'info',
          professional: prof.name,
        });
      }
    }

    return alerts;
  }

  async getPatientNoShowRisk(patientId: string, clinicId: string): Promise<boolean> {
    // Check if patient has NO_SHOW history in the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const noShowCount = await this.prisma.appointment.count({
      where: {
        clinicId,
        patientId,
        status: 'NO_SHOW',
        startTime: { gte: sixMonthsAgo },
      },
    });

    return noShowCount > 0;
  }

  async getAppointmentRiskIndicators(
    appointmentId: string,
    clinicId: string,
    averageProcedurePrice: number
  ): Promise<AppointmentRiskIndicators> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      include: {
        procedure: { select: { price: true } },
        patient: { select: { id: true } },
      },
    });

    if (!appointment) {
      return { noShowRisk: false, isPremium: false, isConfirmed: false };
    }

    const noShowRisk = appointment.patient
      ? await this.getPatientNoShowRisk(appointment.patient.id, clinicId)
      : false;

    const procedurePrice = appointment.procedure
      ? Number(appointment.procedure.price)
      : 0;
    const isPremium = procedurePrice > averageProcedurePrice * 1.5;

    const isConfirmed = ['CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED'].includes(
      appointment.status
    );

    return { noShowRisk, isPremium, isConfirmed };
  }
}
