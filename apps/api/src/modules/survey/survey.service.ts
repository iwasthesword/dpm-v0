import type { PrismaClient, SurveyType, QuestionType, AlertPriority, AlertStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface SurveyWithQuestions {
  id: string;
  clinicId: string;
  name: string;
  type: SurveyType;
  description: string | null;
  isActive: boolean;
  autoSend: boolean;
  triggerAfterDays: number | null;
  thankYouMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  type: QuestionType;
  question: string;
  description: string | null;
  options: string[] | null;
  isRequired: boolean;
  order: number;
}

export interface CreateSurveyInput {
  name: string;
  type: SurveyType;
  description?: string;
  isActive?: boolean;
  autoSend?: boolean;
  triggerAfterDays?: number;
  thankYouMessage?: string;
  questions: {
    type: QuestionType;
    question: string;
    description?: string;
    options?: string[];
    isRequired?: boolean;
    order?: number;
  }[];
}

export interface UpdateSurveyInput {
  name?: string;
  type?: SurveyType;
  description?: string;
  isActive?: boolean;
  autoSend?: boolean;
  triggerAfterDays?: number | null;
  thankYouMessage?: string;
}

export interface NPSAnalytics {
  score: number;
  totalResponses: number;
  promoters: { count: number; percentage: number };
  passives: { count: number; percentage: number };
  detractors: { count: number; percentage: number };
  trend: { period: string; score: number }[];
  responseRate: number;
}

export interface NPSDashboardData {
  currentNPS: number;
  previousNPS: number;
  npsChange: number;
  totalResponses: number;
  pendingAlerts: number;
  responseRate: number;
  breakdown: {
    promoters: number;
    passives: number;
    detractors: number;
  };
  recentResponses: {
    id: string;
    patientName: string;
    score: number;
    completedAt: Date;
    surveyName: string;
  }[];
  trendData: { month: string; score: number }[];
}

export interface SurveyResponseWithDetails {
  id: string;
  patientId: string;
  patientName: string;
  surveyId: string;
  surveyName: string;
  npsScore: number | null;
  completedAt: Date | null;
  answers: {
    questionId: string;
    question: string;
    value: string;
    numericValue: number | null;
  }[];
}

export interface AlertWithDetails {
  id: string;
  clinicId: string;
  responseId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  priority: AlertPriority;
  status: AlertStatus;
  score: number;
  notes: string | null;
  surveyName: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export class SurveyService {
  constructor(private prisma: PrismaClient) {}

  // ==================== SURVEY CRUD ====================

  async listSurveys(clinicId: string): Promise<SurveyWithQuestions[]> {
    const surveys = await this.prisma.survey.findMany({
      where: { clinicId },
      include: { questions: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return surveys.map((s) => ({
      ...s,
      questions: s.questions.map((q) => ({
        ...q,
        options: q.options as string[] | null,
      })),
    }));
  }

  async getSurvey(clinicId: string, id: string): Promise<SurveyWithQuestions | null> {
    const survey = await this.prisma.survey.findFirst({
      where: { id, clinicId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!survey) return null;

    return {
      ...survey,
      questions: survey.questions.map((q) => ({
        ...q,
        options: q.options as string[] | null,
      })),
    };
  }

  async createSurvey(clinicId: string, input: CreateSurveyInput): Promise<SurveyWithQuestions> {
    const survey = await this.prisma.survey.create({
      data: {
        clinicId,
        name: input.name,
        type: input.type,
        description: input.description,
        isActive: input.isActive ?? true,
        autoSend: input.autoSend ?? false,
        triggerAfterDays: input.triggerAfterDays,
        thankYouMessage: input.thankYouMessage,
        questions: {
          create: input.questions.map((q, index) => ({
            type: q.type,
            question: q.question,
            description: q.description,
            options: q.options,
            isRequired: q.isRequired ?? true,
            order: q.order ?? index,
          })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    return {
      ...survey,
      questions: survey.questions.map((q) => ({
        ...q,
        options: q.options as string[] | null,
      })),
    };
  }

  async updateSurvey(
    clinicId: string,
    id: string,
    input: UpdateSurveyInput
  ): Promise<SurveyWithQuestions | null> {
    const existing = await this.prisma.survey.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return null;

    const survey = await this.prisma.survey.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        description: input.description,
        isActive: input.isActive,
        autoSend: input.autoSend,
        triggerAfterDays: input.triggerAfterDays,
        thankYouMessage: input.thankYouMessage,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    return {
      ...survey,
      questions: survey.questions.map((q) => ({
        ...q,
        options: q.options as string[] | null,
      })),
    };
  }

  async deleteSurvey(clinicId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.survey.findFirst({
      where: { id, clinicId },
    });

    if (!existing) return false;

    await this.prisma.survey.delete({ where: { id } });
    return true;
  }

  // ==================== SURVEY QUESTIONS ====================

  async addQuestion(
    clinicId: string,
    surveyId: string,
    input: {
      type: QuestionType;
      question: string;
      description?: string;
      options?: string[];
      isRequired?: boolean;
      order?: number;
    }
  ): Promise<SurveyQuestion | null> {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, clinicId },
    });

    if (!survey) return null;

    // Get max order
    const maxOrder = await this.prisma.surveyQuestion.aggregate({
      where: { surveyId },
      _max: { order: true },
    });

    const question = await this.prisma.surveyQuestion.create({
      data: {
        surveyId,
        type: input.type,
        question: input.question,
        description: input.description,
        options: input.options,
        isRequired: input.isRequired ?? true,
        order: input.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });

    return {
      ...question,
      options: question.options as string[] | null,
    };
  }

  async updateQuestion(
    clinicId: string,
    questionId: string,
    input: {
      type?: QuestionType;
      question?: string;
      description?: string;
      options?: string[];
      isRequired?: boolean;
      order?: number;
    }
  ): Promise<SurveyQuestion | null> {
    const existing = await this.prisma.surveyQuestion.findFirst({
      where: { id: questionId },
      include: { survey: { select: { clinicId: true } } },
    });

    if (!existing || existing.survey.clinicId !== clinicId) return null;

    const question = await this.prisma.surveyQuestion.update({
      where: { id: questionId },
      data: {
        type: input.type,
        question: input.question,
        description: input.description,
        options: input.options,
        isRequired: input.isRequired,
        order: input.order,
      },
    });

    return {
      ...question,
      options: question.options as string[] | null,
    };
  }

  async deleteQuestion(clinicId: string, questionId: string): Promise<boolean> {
    const existing = await this.prisma.surveyQuestion.findFirst({
      where: { id: questionId },
      include: { survey: { select: { clinicId: true } } },
    });

    if (!existing || existing.survey.clinicId !== clinicId) return false;

    await this.prisma.surveyQuestion.delete({ where: { id: questionId } });
    return true;
  }

  // ==================== SURVEY SENDING ====================

  async sendSurvey(
    clinicId: string,
    surveyId: string,
    patientIds: string[],
    appointmentId?: string
  ): Promise<{ token: string; patientId: string }[]> {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, clinicId },
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    const results: { token: string; patientId: string }[] = [];

    for (const patientId of patientIds) {
      // Check if patient exists
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, clinicId },
      });

      if (!patient) continue;

      // Generate unique token
      const token = randomBytes(32).toString('hex');

      await this.prisma.surveyResponse.create({
        data: {
          clinicId,
          surveyId,
          patientId,
          token,
          appointmentId,
          expiresAt,
        },
      });

      results.push({ token, patientId });
    }

    return results;
  }

  // ==================== PUBLIC SURVEY ACCESS ====================

  async getPublicSurvey(token: string): Promise<{
    survey: SurveyWithQuestions;
    patientName: string;
    alreadyCompleted: boolean;
    expired: boolean;
  } | null> {
    const response = await this.prisma.surveyResponse.findUnique({
      where: { token },
      include: {
        survey: {
          include: { questions: { orderBy: { order: 'asc' } } },
        },
        patient: { select: { name: true } },
      },
    });

    if (!response) return null;

    const expired = new Date() > response.expiresAt;

    return {
      survey: {
        ...response.survey,
        questions: response.survey.questions.map((q) => ({
          ...q,
          options: q.options as string[] | null,
        })),
      },
      patientName: response.patient.name,
      alreadyCompleted: !!response.completedAt,
      expired,
    };
  }

  async submitSurveyResponse(
    token: string,
    answers: { questionId: string; value: string; numericValue?: number }[]
  ): Promise<{ success: boolean; message: string; thankYouMessage?: string }> {
    const response = await this.prisma.surveyResponse.findUnique({
      where: { token },
      include: {
        survey: {
          include: { questions: true },
        },
      },
    });

    if (!response) {
      return { success: false, message: 'Survey not found' };
    }

    if (response.completedAt) {
      return { success: false, message: 'Survey already completed' };
    }

    if (new Date() > response.expiresAt) {
      return { success: false, message: 'Survey has expired' };
    }

    // Calculate NPS score from NPS-type question
    const npsQuestion = response.survey.questions.find((q) => q.type === 'NPS');
    const npsAnswer = npsQuestion ? answers.find((a) => a.questionId === npsQuestion.id) : null;
    const npsScore = npsAnswer?.numericValue ?? null;

    // Create answers
    await this.prisma.$transaction(async (tx) => {
      // Save answers
      for (const answer of answers) {
        await tx.surveyResponseAnswer.create({
          data: {
            responseId: response.id,
            questionId: answer.questionId,
            value: answer.value,
            numericValue: answer.numericValue,
          },
        });
      }

      // Update response as completed
      await tx.surveyResponse.update({
        where: { id: response.id },
        data: {
          npsScore,
          completedAt: new Date(),
        },
      });

      // Create alert if NPS score is detractor (0-6)
      if (npsScore !== null && npsScore <= 6) {
        const priority: AlertPriority = npsScore <= 3 ? 'URGENT' : npsScore <= 5 ? 'HIGH' : 'MEDIUM';

        await tx.surveyAlert.create({
          data: {
            clinicId: response.clinicId,
            responseId: response.id,
            patientId: response.patientId,
            priority,
            score: npsScore,
          },
        });
      }
    });

    return {
      success: true,
      message: 'Survey submitted successfully',
      thankYouMessage: response.survey.thankYouMessage || undefined,
    };
  }

  // ==================== SURVEY RESPONSES ====================

  async getResponses(
    clinicId: string,
    surveyId?: string,
    completed?: boolean
  ): Promise<SurveyResponseWithDetails[]> {
    const where: any = { clinicId };
    if (surveyId) where.surveyId = surveyId;
    if (completed !== undefined) {
      where.completedAt = completed ? { not: null } : null;
    }

    const responses = await this.prisma.surveyResponse.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        survey: { select: { name: true } },
        answers: {
          include: {
            question: { select: { question: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return responses.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patient.name,
      surveyId: r.surveyId,
      surveyName: r.survey.name,
      npsScore: r.npsScore,
      completedAt: r.completedAt,
      answers: r.answers.map((a) => ({
        questionId: a.questionId,
        question: a.question.question,
        value: a.value,
        numericValue: a.numericValue,
      })),
    }));
  }

  // ==================== NPS ANALYTICS ====================

  async getNPSAnalytics(
    clinicId: string,
    surveyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<NPSAnalytics> {
    const where: any = {
      clinicId,
      completedAt: { not: null },
      npsScore: { not: null },
    };

    if (surveyId) where.surveyId = surveyId;
    if (startDate || endDate) {
      where.completedAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    const responses = await this.prisma.surveyResponse.findMany({
      where,
      select: { npsScore: true, completedAt: true },
    });

    // Count sent surveys for response rate
    const sentCount = await this.prisma.surveyResponse.count({
      where: {
        clinicId,
        ...(surveyId && { surveyId }),
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      },
    });

    const totalResponses = responses.length;

    if (totalResponses === 0) {
      return {
        score: 0,
        totalResponses: 0,
        promoters: { count: 0, percentage: 0 },
        passives: { count: 0, percentage: 0 },
        detractors: { count: 0, percentage: 0 },
        trend: [],
        responseRate: 0,
      };
    }

    // Calculate NPS
    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    for (const r of responses) {
      const score = r.npsScore!;
      if (score >= 9) promoters++;
      else if (score >= 7) passives++;
      else detractors++;
    }

    const npsScore = Math.round(
      ((promoters - detractors) / totalResponses) * 100
    );

    // Calculate trend (last 6 months)
    const trend = await this.calculateNPSTrend(clinicId, surveyId, 6);

    return {
      score: npsScore,
      totalResponses,
      promoters: {
        count: promoters,
        percentage: (promoters / totalResponses) * 100,
      },
      passives: {
        count: passives,
        percentage: (passives / totalResponses) * 100,
      },
      detractors: {
        count: detractors,
        percentage: (detractors / totalResponses) * 100,
      },
      trend,
      responseRate: sentCount > 0 ? (totalResponses / sentCount) * 100 : 0,
    };
  }

  async getNPSDashboard(clinicId: string): Promise<NPSDashboardData> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get current and previous period analytics
    const [currentAnalytics, previousAnalytics] = await Promise.all([
      this.getNPSAnalytics(clinicId, undefined, thirtyDaysAgo, now),
      this.getNPSAnalytics(clinicId, undefined, sixtyDaysAgo, thirtyDaysAgo),
    ]);

    // Get pending alerts count
    const pendingAlerts = await this.prisma.surveyAlert.count({
      where: {
        clinicId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    // Get recent responses
    const recentResponses = await this.prisma.surveyResponse.findMany({
      where: {
        clinicId,
        completedAt: { not: null },
      },
      include: {
        patient: { select: { name: true } },
        survey: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    // Get trend data
    const trendData = await this.calculateNPSTrend(clinicId, undefined, 6);

    return {
      currentNPS: currentAnalytics.score,
      previousNPS: previousAnalytics.score,
      npsChange: currentAnalytics.score - previousAnalytics.score,
      totalResponses: currentAnalytics.totalResponses,
      pendingAlerts,
      responseRate: currentAnalytics.responseRate,
      breakdown: {
        promoters: currentAnalytics.promoters.count,
        passives: currentAnalytics.passives.count,
        detractors: currentAnalytics.detractors.count,
      },
      recentResponses: recentResponses.map((r) => ({
        id: r.id,
        patientName: r.patient.name,
        score: r.npsScore ?? 0,
        completedAt: r.completedAt!,
        surveyName: r.survey.name,
      })),
      trendData: trendData.map((t) => ({
        month: t.period,
        score: t.score,
      })),
    };
  }

  private async calculateNPSTrend(
    clinicId: string,
    surveyId: string | undefined,
    months: number
  ): Promise<{ period: string; score: number }[]> {
    const trend: { period: string; score: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const where: any = {
        clinicId,
        completedAt: { gte: startOfMonth, lte: endOfMonth },
        npsScore: { not: null },
      };
      if (surveyId) where.surveyId = surveyId;

      const responses = await this.prisma.surveyResponse.findMany({
        where,
        select: { npsScore: true },
      });

      let score = 0;
      if (responses.length > 0) {
        let promoters = 0;
        let detractors = 0;

        for (const r of responses) {
          if (r.npsScore! >= 9) promoters++;
          else if (r.npsScore! <= 6) detractors++;
        }

        score = Math.round(((promoters - detractors) / responses.length) * 100);
      }

      trend.push({
        period: startOfMonth.toLocaleString('default', { month: 'short', year: '2-digit' }),
        score,
      });
    }

    return trend;
  }

  // ==================== ALERTS ====================

  async getAlerts(
    clinicId: string,
    status?: AlertStatus
  ): Promise<AlertWithDetails[]> {
    const where: any = { clinicId };
    if (status) where.status = status;

    const alerts = await this.prisma.surveyAlert.findMany({
      where,
      include: {
        patient: { select: { name: true, phone: true } },
        response: {
          include: {
            survey: { select: { name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });

    return alerts.map((a) => ({
      id: a.id,
      clinicId: a.clinicId,
      responseId: a.responseId,
      patientId: a.patientId,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      priority: a.priority,
      status: a.status,
      score: a.score,
      notes: a.notes,
      surveyName: a.response.survey.name,
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
      resolvedBy: a.resolvedBy,
    }));
  }

  async updateAlert(
    clinicId: string,
    alertId: string,
    input: {
      status?: AlertStatus;
      notes?: string;
      resolvedBy?: string;
    }
  ): Promise<AlertWithDetails | null> {
    const existing = await this.prisma.surveyAlert.findFirst({
      where: { id: alertId, clinicId },
    });

    if (!existing) return null;

    const resolvedAt = input.status === 'RESOLVED' || input.status === 'DISMISSED'
      ? new Date()
      : undefined;

    const alert = await this.prisma.surveyAlert.update({
      where: { id: alertId },
      data: {
        status: input.status,
        notes: input.notes,
        resolvedAt,
        resolvedBy: input.resolvedBy,
      },
      include: {
        patient: { select: { name: true, phone: true } },
        response: {
          include: {
            survey: { select: { name: true } },
          },
        },
      },
    });

    return {
      id: alert.id,
      clinicId: alert.clinicId,
      responseId: alert.responseId,
      patientId: alert.patientId,
      patientName: alert.patient.name,
      patientPhone: alert.patient.phone,
      priority: alert.priority,
      status: alert.status,
      score: alert.score,
      notes: alert.notes,
      surveyName: alert.response.survey.name,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
      resolvedBy: alert.resolvedBy,
    };
  }
}
