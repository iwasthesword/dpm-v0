import type { PrismaClient } from '@prisma/client';

export interface TreatmentSuggestion {
  procedureId: string;
  procedureCode: string;
  procedureName: string;
  tooth: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
}

export interface PatientRiskProfile {
  noShowRisk: 'low' | 'medium' | 'high';
  noShowRate: number;
  noShowCount: number;
  totalAppointments: number;
  treatmentCompliance: number;
  completedPlans: number;
  totalApprovedPlans: number;
  paymentReliability: 'good' | 'fair' | 'poor';
  overdueAmount: number;
  lastVisit: Date | null;
  daysSinceLastVisit: number | null;
}

export interface ClinicalNoteTemplate {
  id: string;
  name: string;
  category: 'evaluation' | 'treatment' | 'post_op' | 'follow_up' | 'general';
  content: string;
  variables: string[];
}

// Map tooth status to suggested procedure codes with priority
const STATUS_TO_PROCEDURES: Record<string, { codes: string[]; priority: 'high' | 'medium' | 'low'; reason: string }> = {
  CARIES: { codes: ['FILL'], priority: 'high', reason: 'Cárie detectada - tratamento urgente recomendado' },
  ROOT_CANAL: { codes: ['ROOT', 'CROWN'], priority: 'high', reason: 'Canal necessário - risco de complicações' },
  EXTRACTION: { codes: ['EXTRAC'], priority: 'high', reason: 'Extração indicada' },
  MISSING: { codes: ['IMPLANT', 'BRIDGE'], priority: 'medium', reason: 'Dente ausente - reabilitação recomendada' },
  IMPACTED: { codes: ['EXTRAC'], priority: 'medium', reason: 'Dente incluso - avaliação para extração' },
  CROWN: { codes: ['CROWN'], priority: 'low', reason: 'Coroa existente - avaliar necessidade de substituição' },
};

// Clinical note templates
const CLINICAL_NOTE_TEMPLATES: ClinicalNoteTemplate[] = [
  {
    id: 'eval-initial',
    name: 'Avaliação Inicial',
    category: 'evaluation',
    content: `Paciente compareceu para avaliação inicial.

Queixa principal:

Exame clínico:
- Tecidos moles:
- Oclusão:
- Periodonto:

Diagnóstico:

Plano de tratamento proposto: `,
    variables: [],
  },
  {
    id: 'eval-return',
    name: 'Consulta de Retorno',
    category: 'evaluation',
    content: `Paciente retornou para acompanhamento.

Evolução desde última consulta:

Exame clínico:

Conduta: `,
    variables: [],
  },
  {
    id: 'treatment-restoration',
    name: 'Restauração',
    category: 'treatment',
    content: `Procedimento realizado: Restauração

Dente(s) tratado(s):
Face(s):
Material utilizado:
Anestesia: ( ) Sim ( ) Não - Tipo:

Observações:

Orientações ao paciente: `,
    variables: ['tooth'],
  },
  {
    id: 'treatment-extraction',
    name: 'Extração',
    category: 'treatment',
    content: `Procedimento realizado: Extração

Dente:
Indicação:
Anestesia utilizada:
Técnica:

Intercorrências: ( ) Não ( ) Sim - Descrever:

Orientações pós-operatórias:
- Morder gaze por 30 minutos
- Não bochechar nas primeiras 24h
- Alimentação fria/morna
- Repouso relativo
- Medicação prescrita: `,
    variables: ['tooth'],
  },
  {
    id: 'treatment-endo',
    name: 'Tratamento Endodôntico',
    category: 'treatment',
    content: `Procedimento: Tratamento de Canal

Dente:
Sessão:
Diagnóstico pulpar:
Diagnóstico periapical:

Procedimento realizado:
- Odontometria:
- Instrumentação:
- Irrigação:
- Medicação intracanal:
- Selamento provisório:

Próxima sessão: `,
    variables: ['tooth'],
  },
  {
    id: 'post-op-general',
    name: 'Pós-Operatório',
    category: 'post_op',
    content: `Acompanhamento pós-operatório

Procedimento realizado anteriormente:
Data do procedimento:

Queixas do paciente:

Exame clínico:
- Edema: ( ) Ausente ( ) Presente - Grau:
- Dor: ( ) Ausente ( ) Presente - Intensidade:
- Sinais de infecção: ( ) Não ( ) Sim

Conduta:

Retorno: `,
    variables: [],
  },
  {
    id: 'follow-up-perio',
    name: 'Manutenção Periodontal',
    category: 'follow_up',
    content: `Consulta de manutenção periodontal

Última manutenção:
Intervalo desde última consulta:

Índice de placa:
Índice de sangramento:
Sondagem periodontal:

Procedimentos realizados:
( ) Raspagem supragengival
( ) Raspagem subgengival
( ) Polimento
( ) Aplicação de flúor

Orientações de higiene:

Próxima manutenção: `,
    variables: [],
  },
  {
    id: 'general-prescription',
    name: 'Prescrição Medicamentosa',
    category: 'general',
    content: `Prescrição realizada para o paciente:

Medicamentos:
1.
   Posologia:
   Duração:

2.
   Posologia:
   Duração:

Orientações adicionais: `,
    variables: [],
  },
];

export class SuggestionsService {
  constructor(private prisma: PrismaClient) {}

  async getSuggestedTreatments(
    patientId: string,
    clinicId: string
  ): Promise<TreatmentSuggestion[]> {
    // Get patient's odontogram
    const odontogram = await this.prisma.odontogram.findUnique({
      where: { patientId },
    });

    if (!odontogram || !odontogram.teeth) {
      return [];
    }

    // Get clinic's procedures for pricing
    const procedures = await this.prisma.procedure.findMany({
      where: { clinicId, isActive: true },
    });

    const procedureMap = new Map(procedures.map(p => [p.code, p]));

    // Get existing treatment plan items to avoid duplicates
    const existingItems = await this.prisma.treatmentPlanItem.findMany({
      where: {
        plan: {
          patientId,
          clinicId,
          status: { in: ['DRAFT', 'PRESENTED', 'APPROVED', 'IN_PROGRESS'] },
        },
      },
      select: { tooth: true, procedureId: true },
    });

    const existingSet = new Set(
      existingItems.map(item => `${item.tooth}-${item.procedureId}`)
    );

    const suggestions: TreatmentSuggestion[] = [];
    const teeth = odontogram.teeth as Record<string, { status?: string; notes?: string }>;

    for (const [toothNumber, toothData] of Object.entries(teeth)) {
      const status = toothData?.status;
      if (!status || status === 'HEALTHY' || status === 'RESTORATION') continue;

      const suggestionConfig = STATUS_TO_PROCEDURES[status];
      if (!suggestionConfig) continue;

      for (const code of suggestionConfig.codes) {
        const procedure = procedureMap.get(code);
        if (!procedure) continue;

        // Skip if already in a treatment plan
        const key = `${toothNumber}-${procedure.id}`;
        if (existingSet.has(key)) continue;

        suggestions.push({
          procedureId: procedure.id,
          procedureCode: procedure.code || '',
          procedureName: procedure.name,
          tooth: parseInt(toothNumber, 10),
          reason: suggestionConfig.reason,
          priority: suggestionConfig.priority,
          estimatedCost: Number(procedure.price),
        });
      }
    }

    // Sort by priority (high first) then by tooth number
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.tooth - b.tooth;
    });

    return suggestions;
  }

  async getPatientRiskProfile(
    patientId: string,
    clinicId: string
  ): Promise<PatientRiskProfile> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get appointment stats
    const [totalAppointments, noShowCount, lastAppointment] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          clinicId,
          patientId,
          startTime: { gte: sixMonthsAgo },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          patientId,
          startTime: { gte: sixMonthsAgo },
          status: 'NO_SHOW',
        },
      }),
      this.prisma.appointment.findFirst({
        where: {
          clinicId,
          patientId,
          status: { in: ['COMPLETED', 'IN_PROGRESS'] },
        },
        orderBy: { startTime: 'desc' },
        select: { startTime: true },
      }),
    ]);

    const noShowRate = totalAppointments > 0
      ? (noShowCount / totalAppointments) * 100
      : 0;

    let noShowRisk: 'low' | 'medium' | 'high' = 'low';
    if (noShowRate > 20) noShowRisk = 'high';
    else if (noShowRate > 10 || noShowCount > 0) noShowRisk = 'medium';

    // Get treatment plan stats
    const [completedPlans, totalApprovedPlans] = await Promise.all([
      this.prisma.treatmentPlan.count({
        where: {
          clinicId,
          patientId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.treatmentPlan.count({
        where: {
          clinicId,
          patientId,
          status: { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] },
        },
      }),
    ]);

    const treatmentCompliance = totalApprovedPlans > 0
      ? (completedPlans / totalApprovedPlans) * 100
      : 100;

    // Get payment stats
    const overduePayments = await this.prisma.payment.aggregate({
      where: {
        clinicId,
        patientId,
        status: 'OVERDUE',
      },
      _sum: { amount: true },
    });

    const overdueAmount = Number(overduePayments._sum.amount || 0);

    let paymentReliability: 'good' | 'fair' | 'poor' = 'good';
    if (overdueAmount > 1000) paymentReliability = 'poor';
    else if (overdueAmount > 0) paymentReliability = 'fair';

    // Calculate days since last visit
    const lastVisit = lastAppointment?.startTime || null;
    const daysSinceLastVisit = lastVisit
      ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      noShowRisk,
      noShowRate,
      noShowCount,
      totalAppointments,
      treatmentCompliance,
      completedPlans,
      totalApprovedPlans,
      paymentReliability,
      overdueAmount,
      lastVisit,
      daysSinceLastVisit,
    };
  }

  getClinicalNoteTemplates(): ClinicalNoteTemplate[] {
    return CLINICAL_NOTE_TEMPLATES;
  }

  getClinicalNoteTemplatesByCategory(
    category: string
  ): ClinicalNoteTemplate[] {
    return CLINICAL_NOTE_TEMPLATES.filter(t => t.category === category);
  }

  getClinicalNoteTemplateById(id: string): ClinicalNoteTemplate | undefined {
    return CLINICAL_NOTE_TEMPLATES.find(t => t.id === id);
  }
}
