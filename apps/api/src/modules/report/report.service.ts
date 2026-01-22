import type { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

export interface ReportOptions {
  startDate?: Date;
  endDate?: Date;
  format: 'excel' | 'csv';
  professionalId?: string;
}

export interface ReportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  // ==================== FINANCIAL REPORTS ====================

  async generateFinancialSummary(clinicId: string, options: ReportOptions): Promise<ReportResult> {
    const { startDate, endDate } = this.getDateRange(options);

    // Get financial data
    const [payments, transactions] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          clinicId,
          paidAt: { gte: startDate, lte: endDate },
        },
        include: {
          patient: { select: { name: true } },
        },
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          clinicId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    // Calculate totals (convert Decimal to number)
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DPM System';
    workbook.created = new Date();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Resumo');
    summarySheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
    ];
    summarySheet.addRows([
      { metric: 'Período', value: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}` },
      { metric: 'Total de Receitas', value: this.formatCurrency(totalRevenue) },
      { metric: 'Total de Despesas', value: this.formatCurrency(totalExpenses) },
      { metric: 'Lucro Líquido', value: this.formatCurrency(netProfit) },
      { metric: 'Quantidade de Pagamentos', value: payments.length },
      { metric: 'Quantidade de Transações', value: transactions.length },
    ]);
    this.styleHeaderRow(summarySheet);

    // Payments sheet
    const paymentsSheet = workbook.addWorksheet('Pagamentos');
    paymentsSheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Paciente', key: 'patient', width: 30 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Método', key: 'method', width: 15 },
      { header: 'Valor', key: 'amount', width: 15 },
    ];
    payments.forEach((p) => {
      paymentsSheet.addRow({
        date: this.formatDate(p.paidAt),
        patient: p.patient?.name || '-',
        description: p.description || '-',
        method: p.method ? this.translatePaymentMethod(p.method) : '-',
        amount: this.formatCurrency(Number(p.amount)),
      });
    });
    this.styleHeaderRow(paymentsSheet);

    // Transactions sheet
    const transactionsSheet = workbook.addWorksheet('Transações');
    transactionsSheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Valor', key: 'amount', width: 15 },
    ];
    transactions.forEach((t) => {
      transactionsSheet.addRow({
        date: this.formatDate(t.date),
        type: t.type === 'EXPENSE' ? 'Despesa' : 'Receita',
        category: t.category || '-',
        description: t.description || '-',
        amount: this.formatCurrency(Number(t.amount)),
      });
    });
    this.styleHeaderRow(transactionsSheet);

    const buffer = await this.workbookToBuffer(workbook, options.format);
    const ext = options.format === 'csv' ? 'csv' : 'xlsx';

    return {
      buffer,
      filename: `relatorio-financeiro-${this.formatDateForFile(startDate)}-${this.formatDateForFile(endDate)}.${ext}`,
      mimeType: this.getMimeType(options.format),
    };
  }

  // ==================== PATIENT REPORTS ====================

  async generatePatientList(clinicId: string, options: ReportOptions): Promise<ReportResult> {
    const patients = await this.prisma.patient.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pacientes');

    sheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'CPF', key: 'cpf', width: 15 },
      { header: 'Data de Nascimento', key: 'birthDate', width: 18 },
      { header: 'Telefone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Gênero', key: 'gender', width: 12 },
      { header: 'Origem', key: 'source', width: 15 },
      { header: 'Data de Cadastro', key: 'createdAt', width: 18 },
    ];

    patients.forEach((p) => {
      sheet.addRow({
        name: p.name,
        cpf: p.cpf || '-',
        birthDate: p.birthDate ? this.formatDate(p.birthDate) : '-',
        phone: p.phone,
        email: p.email || '-',
        gender: this.translateGender(p.gender),
        source: p.source || '-',
        createdAt: this.formatDate(p.createdAt),
      });
    });

    this.styleHeaderRow(sheet);

    const buffer = await this.workbookToBuffer(workbook, options.format);
    const ext = options.format === 'csv' ? 'csv' : 'xlsx';

    return {
      buffer,
      filename: `lista-pacientes-${this.formatDateForFile(new Date())}.${ext}`,
      mimeType: this.getMimeType(options.format),
    };
  }

  // ==================== APPOINTMENT REPORTS ====================

  async generateAppointmentHistory(
    clinicId: string,
    options: ReportOptions
  ): Promise<ReportResult> {
    const { startDate, endDate } = this.getDateRange(options);

    const where: Record<string, unknown> = {
      clinicId,
      startTime: { gte: startDate, lte: endDate },
    };

    if (options.professionalId) {
      where.professionalId = options.professionalId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        professional: { select: { user: { select: { name: true } } } },
      },
      orderBy: { startTime: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Agendamentos');

    sheet.columns = [
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Horário', key: 'time', width: 12 },
      { header: 'Paciente', key: 'patient', width: 30 },
      { header: 'Profissional', key: 'professional', width: 30 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Observações', key: 'notes', width: 40 },
    ];

    appointments.forEach((a) => {
      sheet.addRow({
        date: this.formatDate(a.startTime),
        time: this.formatTime(a.startTime),
        patient: a.patient?.name || '-',
        professional: a.professional?.user?.name || '-',
        type: this.translateAppointmentType(a.type),
        status: this.translateAppointmentStatus(a.status),
        notes: a.notes || '-',
      });
    });

    this.styleHeaderRow(sheet);

    const buffer = await this.workbookToBuffer(workbook, options.format);
    const ext = options.format === 'csv' ? 'csv' : 'xlsx';

    return {
      buffer,
      filename: `historico-agendamentos-${this.formatDateForFile(startDate)}-${this.formatDateForFile(endDate)}.${ext}`,
      mimeType: this.getMimeType(options.format),
    };
  }

  // ==================== COMMISSION REPORTS ====================

  async generateCommissionReport(clinicId: string, options: ReportOptions): Promise<ReportResult> {
    const { startDate, endDate } = this.getDateRange(options);

    const professionals = await this.prisma.professional.findMany({
      where: { clinicId },
      include: {
        user: { select: { name: true } },
      },
    });

    // Get completed appointments in date range
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        status: 'COMPLETED',
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        professional: true,
        treatments: {
          include: { procedure: true },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Comissões');

    sheet.columns = [
      { header: 'Profissional', key: 'professional', width: 30 },
      { header: 'Atendimentos', key: 'appointments', width: 15 },
      { header: 'Receita Bruta', key: 'revenue', width: 18 },
      { header: 'Tipo de Comissão', key: 'commissionType', width: 18 },
      { header: 'Taxa/Valor', key: 'rate', width: 15 },
      { header: 'Comissão Total', key: 'commission', width: 18 },
    ];

    professionals.forEach((prof) => {
      const profAppointments = appointments.filter(
        (a) => a.professionalId === prof.id
      );
      const revenue = profAppointments.reduce((sum, a) => {
        return (
          sum +
          a.treatments.reduce((tSum, t) => tSum + Number(t.procedure?.price || 0), 0)
        );
      }, 0);

      // Commission is stored directly on Professional model
      let commission = 0;
      let rateDisplay = '-';
      const commissionValue = Number(prof.commissionValue) || 0;

      if (prof.commissionType === 'PERCENTAGE') {
        commission = revenue * (commissionValue / 100);
        rateDisplay = `${commissionValue}%`;
      } else if (prof.commissionType === 'FIXED') {
        commission = commissionValue;
        rateDisplay = this.formatCurrency(commission);
      }

      sheet.addRow({
        professional: prof.user?.name || prof.name,
        appointments: profAppointments.length,
        revenue: this.formatCurrency(revenue),
        commissionType: this.translateCommissionType(prof.commissionType),
        rate: rateDisplay,
        commission: this.formatCurrency(commission),
      });
    });

    this.styleHeaderRow(sheet);

    const buffer = await this.workbookToBuffer(workbook, options.format);
    const ext = options.format === 'csv' ? 'csv' : 'xlsx';

    return {
      buffer,
      filename: `relatorio-comissoes-${this.formatDateForFile(startDate)}-${this.formatDateForFile(endDate)}.${ext}`,
      mimeType: this.getMimeType(options.format),
    };
  }

  // ==================== ACTIVITY LOG REPORTS ====================

  async generateActivityLog(clinicId: string, options: ReportOptions): Promise<ReportResult> {
    const { startDate, endDate } = this.getDateRange(options);

    const logs = await this.prisma.activityLog.findMany({
      where: {
        user: { clinicId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Log de Atividades');

    sheet.columns = [
      { header: 'Data/Hora', key: 'datetime', width: 20 },
      { header: 'Usuário', key: 'user', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Ação', key: 'action', width: 20 },
      { header: 'Entidade', key: 'entity', width: 15 },
      { header: 'ID da Entidade', key: 'entityId', width: 25 },
      { header: 'Detalhes', key: 'details', width: 50 },
    ];

    logs.forEach((log) => {
      sheet.addRow({
        datetime: this.formatDateTime(log.createdAt),
        user: log.user?.name || '-',
        email: log.user?.email || '-',
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details ? JSON.stringify(log.details) : '-',
      });
    });

    this.styleHeaderRow(sheet);

    const buffer = await this.workbookToBuffer(workbook, options.format);
    const ext = options.format === 'csv' ? 'csv' : 'xlsx';

    return {
      buffer,
      filename: `log-atividades-${this.formatDateForFile(startDate)}-${this.formatDateForFile(endDate)}.${ext}`,
      mimeType: this.getMimeType(options.format),
    };
  }

  // ==================== HELPER METHODS ====================

  private getDateRange(options: ReportOptions): { startDate: Date; endDate: Date } {
    const endDate = options.endDate || new Date();
    const startDate =
      options.startDate ||
      new Date(endDate.getFullYear(), endDate.getMonth(), 1); // Default to first of current month

    return { startDate, endDate };
  }

  private async workbookToBuffer(
    workbook: ExcelJS.Workbook,
    format: 'excel' | 'csv'
  ): Promise<Buffer> {
    if (format === 'csv') {
      // For CSV, we export only the first sheet
      const csvBuffer = await workbook.csv.writeBuffer();
      return Buffer.from(csvBuffer);
    }
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
  }

  private getMimeType(format: 'excel' | 'csv'): string {
    if (format === 'csv') {
      return 'text/csv';
    }
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { horizontal: 'center' };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(date);
  }

  private formatDateForFile(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private translatePaymentMethod(method: string): string {
    const methods: Record<string, string> = {
      CASH: 'Dinheiro',
      CREDIT_CARD: 'Cartão de Crédito',
      DEBIT_CARD: 'Cartão de Débito',
      PIX: 'PIX',
      BANK_TRANSFER: 'Transferência',
      CHECK: 'Cheque',
      INSTALLMENT: 'Parcelado',
    };
    return methods[method] || method;
  }

  private translateGender(gender: string | null): string {
    if (!gender) return '-';
    const genders: Record<string, string> = {
      MALE: 'Masculino',
      FEMALE: 'Feminino',
      OTHER: 'Outro',
    };
    return genders[gender] || gender;
  }

  private translateAppointmentType(type: string): string {
    const types: Record<string, string> = {
      EVALUATION: 'Avaliação',
      TREATMENT: 'Tratamento',
      RETURN: 'Retorno',
      EMERGENCY: 'Emergência',
      MAINTENANCE: 'Manutenção',
    };
    return types[type] || type;
  }

  private translateAppointmentStatus(status: string): string {
    const statuses: Record<string, string> = {
      SCHEDULED: 'Agendado',
      CONFIRMED: 'Confirmado',
      WAITING: 'Aguardando',
      IN_PROGRESS: 'Em Andamento',
      COMPLETED: 'Concluído',
      NO_SHOW: 'Não Compareceu',
      CANCELLED: 'Cancelado',
    };
    return statuses[status] || status;
  }

  private translateCommissionType(type: string): string {
    const types: Record<string, string> = {
      PERCENTAGE: 'Percentual',
      FIXED: 'Fixo',
      PER_PROCEDURE: 'Por Procedimento',
    };
    return types[type] || type;
  }
}
