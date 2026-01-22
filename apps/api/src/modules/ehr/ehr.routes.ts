import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { SuggestionsService } from './suggestions.service.js';

export async function ehrRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  const suggestionsService = new SuggestionsService(fastify.prisma);

  // ==================== ODONTOGRAM ROUTES ====================

  // Get patient odontogram
  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/odontogram',
    async (request, reply) => {
      const { patientId } = request.params;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      // Get or create odontogram
      let odontogram = await fastify.prisma.odontogram.findUnique({
        where: { patientId },
      });

      if (!odontogram) {
        // Create default odontogram
        odontogram = await fastify.prisma.odontogram.create({
          data: {
            clinicId: request.user.clinicId,
            patientId,
            type: 'ADULT',
            teeth: {},
          },
        });
      }

      return reply.send({ success: true, odontogram });
    }
  );

  // Update patient odontogram
  fastify.put<{
    Params: { patientId: string };
    Body: { type?: string; teeth: Record<string, unknown> };
  }>(
    '/patients/:patientId/odontogram',
    async (request, reply) => {
      const { patientId } = request.params;
      const { type, teeth } = request.body;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      // Get existing odontogram
      let odontogram = await fastify.prisma.odontogram.findUnique({
        where: { patientId },
      });

      if (odontogram) {
        // Store history for changed teeth
        const existingTeeth = odontogram.teeth as Record<string, unknown>;
        for (const [toothNumber, newData] of Object.entries(teeth)) {
          if (existingTeeth[toothNumber]) {
            await fastify.prisma.odontogramHistory.create({
              data: {
                odontogramId: odontogram.id,
                tooth: toothNumber,
                previousData: existingTeeth[toothNumber] as object,
                newData: newData as object,
                changedBy: request.user.userId,
              },
            });
          }
        }

        // Merge teeth data
        const updatedTeeth = { ...existingTeeth, ...teeth };

        odontogram = await fastify.prisma.odontogram.update({
          where: { id: odontogram.id },
          data: {
            type: type ?? odontogram.type,
            teeth: updatedTeeth as object,
          },
        });
      } else {
        odontogram = await fastify.prisma.odontogram.create({
          data: {
            clinicId: request.user.clinicId,
            patientId,
            type: type ?? 'ADULT',
            teeth: teeth as object,
          },
        });
      }

      return reply.send({ success: true, odontogram });
    }
  );

  // Get odontogram history
  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/odontogram/history',
    async (request, reply) => {
      const { patientId } = request.params;

      const odontogram = await fastify.prisma.odontogram.findFirst({
        where: { patientId, clinicId: request.user.clinicId },
      });

      if (!odontogram) {
        return reply.send({ success: true, history: [] });
      }

      const history = await fastify.prisma.odontogramHistory.findMany({
        where: { odontogramId: odontogram.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return reply.send({ success: true, history });
    }
  );

  // ==================== CLINICAL NOTES ROUTES ====================

  // Get patient clinical notes
  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/notes',
    async (request, reply) => {
      const { patientId } = request.params;

      const notes = await fastify.prisma.clinicalNote.findMany({
        where: { patientId, clinicId: request.user.clinicId },
        include: {
          professional: { select: { id: true, name: true } },
          appointment: { select: { id: true, startTime: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, notes });
    }
  );

  // Create clinical note
  fastify.post<{
    Params: { patientId: string };
    Body: { appointmentId?: string; content: string; isFinal?: boolean };
  }>(
    '/patients/:patientId/notes',
    async (request, reply) => {
      const { patientId } = request.params;
      const { appointmentId, content, isFinal } = request.body;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      // Get professional for current user
      const professional = await fastify.prisma.professional.findFirst({
        where: { clinicId: request.user.clinicId },
      });

      if (!professional) {
        return reply.status(400).send({ success: false, error: 'No professional found' });
      }

      const note = await fastify.prisma.clinicalNote.create({
        data: {
          clinicId: request.user.clinicId,
          patientId,
          professionalId: professional.id,
          appointmentId,
          content,
          isFinal: isFinal ?? false,
          finalizedAt: isFinal ? new Date() : null,
        },
        include: {
          professional: { select: { id: true, name: true } },
        },
      });

      return reply.status(201).send({ success: true, note });
    }
  );

  // Update clinical note
  fastify.put<{
    Params: { patientId: string; noteId: string };
    Body: { content: string; isFinal?: boolean };
  }>(
    '/patients/:patientId/notes/:noteId',
    async (request, reply) => {
      const { noteId } = request.params;
      const { content, isFinal } = request.body;

      const note = await fastify.prisma.clinicalNote.findFirst({
        where: { id: noteId, clinicId: request.user.clinicId },
      });

      if (!note) {
        return reply.status(404).send({ success: false, error: 'Note not found' });
      }

      if (note.isFinal) {
        return reply.status(400).send({ success: false, error: 'Cannot edit finalized note' });
      }

      const updatedNote = await fastify.prisma.clinicalNote.update({
        where: { id: noteId },
        data: {
          content,
          isFinal: isFinal ?? note.isFinal,
          finalizedAt: isFinal ? new Date() : null,
        },
        include: {
          professional: { select: { id: true, name: true } },
        },
      });

      return reply.send({ success: true, note: updatedNote });
    }
  );

  // ==================== TREATMENT PLANS ROUTES ====================

  // Get patient treatment plans
  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/treatment-plans',
    async (request, reply) => {
      const { patientId } = request.params;

      const plans = await fastify.prisma.treatmentPlan.findMany({
        where: { patientId, clinicId: request.user.clinicId },
        include: {
          professional: { select: { id: true, name: true } },
          items: {
            include: {
              procedure: { select: { id: true, name: true, code: true } },
            },
            orderBy: { priority: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, plans });
    }
  );

  // Create treatment plan
  fastify.post<{
    Params: { patientId: string };
    Body: {
      name: string;
      description?: string;
      items: Array<{
        procedureId: string;
        tooth?: string;
        quantity?: number;
        unitPrice: number;
        notes?: string;
        priority?: number;
      }>;
    };
  }>(
    '/patients/:patientId/treatment-plans',
    async (request, reply) => {
      const { patientId } = request.params;
      const { name, description, items } = request.body;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      // Get professional
      const professional = await fastify.prisma.professional.findFirst({
        where: { clinicId: request.user.clinicId },
      });

      if (!professional) {
        return reply.status(400).send({ success: false, error: 'No professional found' });
      }

      // Calculate total cost
      const totalCost = items.reduce((sum, item) => sum + item.unitPrice * (item.quantity ?? 1), 0);

      const plan = await fastify.prisma.treatmentPlan.create({
        data: {
          clinicId: request.user.clinicId,
          patientId,
          professionalId: professional.id,
          name,
          description,
          totalCost,
          items: {
            create: items.map((item, index) => ({
              procedureId: item.procedureId,
              tooth: item.tooth,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * (item.quantity ?? 1),
              priority: item.priority ?? index,
              notes: item.notes,
            })),
          },
        },
        include: {
          professional: { select: { id: true, name: true } },
          items: {
            include: {
              procedure: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      return reply.status(201).send({ success: true, plan });
    }
  );

  // Update treatment plan status
  fastify.patch<{
    Params: { patientId: string; planId: string };
    Body: { status: string };
  }>(
    '/patients/:patientId/treatment-plans/:planId/status',
    async (request, reply) => {
      const { planId } = request.params;
      const { status } = request.body;

      const plan = await fastify.prisma.treatmentPlan.findFirst({
        where: { id: planId, clinicId: request.user.clinicId },
      });

      if (!plan) {
        return reply.status(404).send({ success: false, error: 'Treatment plan not found' });
      }

      const updateData: Record<string, unknown> = { status };
      if (status === 'PRESENTED') {
        updateData.presentedAt = new Date();
      } else if (status === 'APPROVED') {
        updateData.approvedAt = new Date();
      }

      const updatedPlan = await fastify.prisma.treatmentPlan.update({
        where: { id: planId },
        data: updateData,
        include: {
          professional: { select: { id: true, name: true } },
          items: {
            include: {
              procedure: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      return reply.send({ success: true, plan: updatedPlan });
    }
  );

  // ==================== AI SUGGESTIONS ROUTES ====================

  // Get treatment suggestions based on odontogram
  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/suggestions',
    {
      schema: {
        description: 'Get AI-powered treatment suggestions based on patient odontogram',
        tags: ['EHR'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      const suggestions = await suggestionsService.getSuggestedTreatments(
        patientId,
        request.user.clinicId
      );

      return reply.send({ success: true, suggestions });
    }
  );

  // Get patient risk profile
  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/risk-profile',
    {
      schema: {
        description: 'Get patient risk profile including no-show risk, treatment compliance, and payment reliability',
        tags: ['EHR'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      const riskProfile = await suggestionsService.getPatientRiskProfile(
        patientId,
        request.user.clinicId
      );

      return reply.send({ success: true, riskProfile });
    }
  );

  // Get clinical note templates
  fastify.get(
    '/clinical-note-templates',
    {
      schema: {
        description: 'Get available clinical note templates',
        tags: ['EHR'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const templates = suggestionsService.getClinicalNoteTemplates();
      return reply.send({ success: true, templates });
    }
  );

  // Get clinical note template by ID
  fastify.get<{ Params: { templateId: string } }>(
    '/clinical-note-templates/:templateId',
    {
      schema: {
        description: 'Get a specific clinical note template',
        tags: ['EHR'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { templateId } = request.params;
      const template = suggestionsService.getClinicalNoteTemplateById(templateId);

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      return reply.send({ success: true, template });
    }
  );
}
