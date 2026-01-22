import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { generateDocumentPdf } from '../../integrations/pdf/pdf.service.js';

export async function documentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // ==================== DOCUMENT TEMPLATES ====================

  // Get all document templates
  fastify.get('/templates', {
    handler: async (request, reply) => {
      const templates = await fastify.prisma.documentTemplate.findMany({
        where: { clinicId: request.user.clinicId, isActive: true },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      return reply.send({ success: true, templates });
    },
  });

  // Get templates by type
  fastify.get<{ Params: { type: string } }>('/templates/type/:type', {
    handler: async (request, reply) => {
      const templates = await fastify.prisma.documentTemplate.findMany({
        where: {
          clinicId: request.user.clinicId,
          type: request.params.type,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return reply.send({ success: true, templates });
    },
  });

  // Get single template
  fastify.get<{ Params: { id: string } }>('/templates/:id', {
    handler: async (request, reply) => {
      const template = await fastify.prisma.documentTemplate.findFirst({
        where: {
          id: request.params.id,
          clinicId: request.user.clinicId,
        },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      return reply.send({ success: true, template });
    },
  });

  // Create document template
  fastify.post('/templates', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN' && request.user.role !== 'DENTIST') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators and dentists can create templates',
        });
      }

      const { type, name, content, paperSize, orientation, headerHtml, footerHtml, isDefault } =
        request.body as any;

      // If setting as default, unset other defaults of same type
      if (isDefault) {
        await fastify.prisma.documentTemplate.updateMany({
          where: { clinicId: request.user.clinicId, type, isDefault: true },
          data: { isDefault: false },
        });
      }

      const template = await fastify.prisma.documentTemplate.create({
        data: {
          clinicId: request.user.clinicId,
          type,
          name,
          content,
          paperSize: paperSize || 'A4',
          orientation: orientation || 'PORTRAIT',
          headerHtml,
          footerHtml,
          isDefault: isDefault || false,
        },
      });

      return reply.status(201).send({ success: true, template });
    },
  });

  // Update document template
  fastify.put<{ Params: { id: string } }>('/templates/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN' && request.user.role !== 'DENTIST') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators and dentists can update templates',
        });
      }

      const template = await fastify.prisma.documentTemplate.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      const { type, name, content, paperSize, orientation, headerHtml, footerHtml, isDefault } =
        request.body as any;

      // If setting as default, unset other defaults of same type
      if (isDefault && !template.isDefault) {
        await fastify.prisma.documentTemplate.updateMany({
          where: { clinicId: request.user.clinicId, type: type || template.type, isDefault: true },
          data: { isDefault: false },
        });
      }

      const updated = await fastify.prisma.documentTemplate.update({
        where: { id: request.params.id },
        data: {
          type,
          name,
          content,
          paperSize,
          orientation,
          headerHtml,
          footerHtml,
          isDefault,
        },
      });

      return reply.send({ success: true, template: updated });
    },
  });

  // Delete document template (soft delete)
  fastify.delete<{ Params: { id: string } }>('/templates/:id', {
    handler: async (request, reply) => {
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: 'Only administrators can delete templates',
        });
      }

      await fastify.prisma.documentTemplate.update({
        where: { id: request.params.id },
        data: { isActive: false },
      });

      return reply.send({ success: true });
    },
  });

  // ==================== PATIENT DOCUMENTS ====================

  // Get documents for a patient
  fastify.get<{ Params: { patientId: string }; Querystring: { type?: string } }>(
    '/patients/:patientId',
    {
      handler: async (request, reply) => {
        const { type } = request.query;

        const documents = await fastify.prisma.patientDocument.findMany({
          where: {
            clinicId: request.user.clinicId,
            patientId: request.params.patientId,
            ...(type && { type }),
          },
          select: {
            id: true,
            type: true,
            title: true,
            content: true,
            medications: true,
            pdfUrl: true,
            signedAt: true,
            signerName: true,
            signerCpf: true,
            createdAt: true,
            template: { select: { name: true, type: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return reply.send({ success: true, documents });
      },
    }
  );

  // Get single document
  fastify.get<{ Params: { id: string } }>('/:id', {
    handler: async (request, reply) => {
      const document = await fastify.prisma.patientDocument.findFirst({
        where: {
          id: request.params.id,
          clinicId: request.user.clinicId,
        },
        include: {
          patient: { select: { id: true, name: true, cpf: true, birthDate: true, phone: true } },
          template: true,
        },
      });

      if (!document) {
        return reply.status(404).send({ success: false, error: 'Document not found' });
      }

      return reply.send({ success: true, document });
    },
  });

  // Generate a new document for a patient
  fastify.post<{ Params: { patientId: string } }>('/patients/:patientId', {
    handler: async (request, reply) => {
      const { templateId, title, content, appointmentId, treatmentId, medications } =
        request.body as any;

      // Verify patient exists and belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: request.params.patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      // Verify template exists
      const template = await fastify.prisma.documentTemplate.findFirst({
        where: { id: templateId, clinicId: request.user.clinicId },
      });

      if (!template) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      const document = await fastify.prisma.patientDocument.create({
        data: {
          clinicId: request.user.clinicId,
          patientId: request.params.patientId,
          templateId,
          type: template.type,
          title: title || template.name,
          content,
          appointmentId,
          treatmentId,
          medications,
          generatedBy: request.user.userId,
        },
        include: {
          template: { select: { name: true, type: true } },
        },
      });

      return reply.status(201).send({ success: true, document });
    },
  });

  // Update document (add signature)
  fastify.patch<{ Params: { id: string } }>('/:id/sign', {
    handler: async (request, reply) => {
      const document = await fastify.prisma.patientDocument.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!document) {
        return reply.status(404).send({ success: false, error: 'Document not found' });
      }

      const { signatureUrl, signerName, signerCpf } = request.body as any;

      const updated = await fastify.prisma.patientDocument.update({
        where: { id: request.params.id },
        data: {
          signatureUrl,
          signerName,
          signerCpf,
          signedAt: new Date(),
        },
      });

      return reply.send({ success: true, document: updated });
    },
  });

  // Generate PDF for a document
  fastify.get<{ Params: { id: string } }>('/:id/pdf', {
    handler: async (request, reply) => {
      const document = await fastify.prisma.patientDocument.findFirst({
        where: {
          id: request.params.id,
          clinicId: request.user.clinicId,
        },
        include: {
          patient: {
            select: { name: true, cpf: true, birthDate: true, phone: true },
          },
          template: true,
        },
      });

      if (!document) {
        return reply.status(404).send({ success: false, error: 'Document not found' });
      }

      // Get clinic info
      const clinic = await fastify.prisma.clinic.findUnique({
        where: { id: request.user.clinicId },
        select: {
          name: true,
          tradeName: true,
          phone: true,
          email: true,
          address: true,
        },
      });

      // Get professional info if document was generated by a dentist
      const generatedByUser = await fastify.prisma.user.findUnique({
        where: { id: document.generatedBy },
        select: { id: true },
      });

      let professional = null;
      if (generatedByUser) {
        professional = await fastify.prisma.professional.findUnique({
          where: { userId: generatedByUser.id },
          select: { name: true, cro: true, croState: true, specialty: true },
        });
      }

      try {
        const pdfBuffer = await generateDocumentPdf({
          title: document.title,
          type: document.type,
          content: document.content as Record<string, any>,
          medications: document.medications as any[] | undefined,
          patient: {
            name: document.patient.name,
            cpf: document.patient.cpf || undefined,
            birthDate: document.patient.birthDate || undefined,
            phone: document.patient.phone || undefined,
          },
          clinic: {
            name: clinic?.name || '',
            tradeName: clinic?.tradeName || undefined,
            phone: clinic?.phone || undefined,
            email: clinic?.email || undefined,
            address: clinic?.address as any,
          },
          professional: professional ? {
            name: professional.name,
            cro: professional.cro || undefined,
            croState: professional.croState || undefined,
            specialty: professional.specialty || undefined,
          } : undefined,
          template: {
            name: document.template.name,
            content: document.template.content,
            headerHtml: document.template.headerHtml || undefined,
            footerHtml: document.template.footerHtml || undefined,
            paperSize: document.template.paperSize || 'A4',
            orientation: document.template.orientation || 'PORTRAIT',
          },
          signedAt: document.signedAt || undefined,
          signerName: document.signerName || undefined,
          createdAt: document.createdAt,
        });

        const filename = `${document.type.toLowerCase()}_${document.patient.name.replace(/\s+/g, '_')}_${document.createdAt.toISOString().split('T')[0]}.pdf`;

        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        return reply.send(pdfBuffer);
      } catch (error: any) {
        fastify.log.error('PDF generation error:', error?.message || error);
        console.error('Full PDF error:', error);
        return reply.status(500).send({ success: false, error: error?.message || 'Failed to generate PDF' });
      }
    },
  });

  // Delete document
  fastify.delete<{ Params: { id: string } }>('/:id', {
    handler: async (request, reply) => {
      const document = await fastify.prisma.patientDocument.findFirst({
        where: { id: request.params.id, clinicId: request.user.clinicId },
      });

      if (!document) {
        return reply.status(404).send({ success: false, error: 'Document not found' });
      }

      // Only allow deletion if not signed
      if (document.signedAt) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete signed documents',
        });
      }

      await fastify.prisma.patientDocument.delete({
        where: { id: request.params.id },
      });

      return reply.send({ success: true });
    },
  });
}
