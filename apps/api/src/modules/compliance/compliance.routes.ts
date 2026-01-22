import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFile, deleteFile } from '../../integrations/storage/minio.js';
import { ComplianceService } from './compliance.service.js';
import { createId } from '@paralleldrive/cuid2';
import type { DocumentCategory, ComplianceStatus } from '@prisma/client';

export async function complianceRoutes(fastify: FastifyInstance) {
  const complianceService = new ComplianceService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get compliance dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const dashboard = await complianceService.getDashboard(request.user.clinicId);
    return reply.send({ success: true, dashboard });
  });

  // List all compliance documents
  fastify.get<{
    Querystring: {
      category?: DocumentCategory;
      status?: ComplianceStatus;
      professionalId?: string;
    };
  }>('/documents', async (request, reply) => {
    const { category, status, professionalId } = request.query;

    const documents = await complianceService.listDocuments(
      request.user.clinicId,
      category,
      status,
      professionalId
    );

    return reply.send({ success: true, documents });
  });

  // Get expiring documents
  fastify.get<{ Querystring: { days?: number } }>('/documents/expiring', async (request, reply) => {
    const days = request.query.days || 30;
    const documents = await complianceService.getExpiringDocuments(request.user.clinicId, days);
    return reply.send({ success: true, documents });
  });

  // Get single document
  fastify.get<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const document = await complianceService.getDocument(request.user.clinicId, request.params.id);

    if (!document) {
      return reply.status(404).send({ success: false, error: 'Document not found' });
    }

    return reply.send({ success: true, document });
  });

  // Upload new compliance document
  fastify.post('/documents', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ success: false, error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const fileExt = data.filename.split('.').pop()?.toLowerCase() || 'pdf';
    const documentId = createId();
    const fileName = `${documentId}.${fileExt}`;
    const folder = `clinics/${request.user.clinicId}/compliance`;

    // Get form fields
    const fields = data.fields as Record<string, { value?: string }>;
    const name = fields.name?.value;
    const description = fields.description?.value;
    const category = fields.category?.value as DocumentCategory;
    const documentNumber = fields.documentNumber?.value;
    const issueDate = fields.issueDate?.value ? new Date(fields.issueDate.value) : undefined;
    const expirationDate = fields.expirationDate?.value
      ? new Date(fields.expirationDate.value)
      : undefined;
    const professionalId = fields.professionalId?.value;
    const notes = fields.notes?.value;

    if (!name || !category) {
      return reply.status(400).send({
        success: false,
        error: 'Name and category are required',
      });
    }

    try {
      const fileUrl = await uploadFile(buffer, fileName, data.mimetype, folder);

      const document = await complianceService.createDocument(
        request.user.clinicId,
        request.user.userId,
        {
          name,
          description,
          category,
          documentNumber,
          fileUrl,
          fileName: data.filename,
          fileSize: buffer.length,
          mimeType: data.mimetype,
          issueDate,
          expirationDate,
          professionalId,
          notes,
        }
      );

      return reply.status(201).send({ success: true, document });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to upload document' });
    }
  });

  // Update document metadata
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      category?: DocumentCategory;
      documentNumber?: string;
      issueDate?: string;
      expirationDate?: string;
      professionalId?: string;
      notes?: string;
    };
  }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category) updateData.category = body.category;
    if (body.documentNumber !== undefined) updateData.documentNumber = body.documentNumber;
    if (body.issueDate) updateData.issueDate = new Date(body.issueDate);
    if (body.expirationDate) updateData.expirationDate = new Date(body.expirationDate);
    if (body.professionalId !== undefined) updateData.professionalId = body.professionalId || null;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const document = await complianceService.updateDocument(
      request.user.clinicId,
      id,
      updateData
    );

    if (!document) {
      return reply.status(404).send({ success: false, error: 'Document not found' });
    }

    return reply.send({ success: true, document });
  });

  // Delete document
  fastify.delete<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;

    // Get document to find file URL
    const document = await complianceService.getDocument(request.user.clinicId, id);

    if (!document) {
      return reply.status(404).send({ success: false, error: 'Document not found' });
    }

    try {
      // Delete from storage
      const key = document.fileUrl.split('/').slice(-3).join('/');
      await deleteFile(key);
    } catch (error) {
      fastify.log.warn({ err: error }, 'Failed to delete file from storage');
    }

    const deleted = await complianceService.deleteDocument(request.user.clinicId, id);

    if (!deleted) {
      return reply.status(404).send({ success: false, error: 'Document not found' });
    }

    return reply.send({ success: true });
  });

  // Mark document renewal started
  fastify.post<{ Params: { id: string } }>('/documents/:id/renew', async (request, reply) => {
    const document = await complianceService.markRenewalStarted(
      request.user.clinicId,
      request.params.id
    );

    if (!document) {
      return reply.status(404).send({ success: false, error: 'Document not found' });
    }

    return reply.send({ success: true, document });
  });

  // Update all document statuses (can be called periodically)
  fastify.post('/update-statuses', async (request, reply) => {
    const updated = await complianceService.updateStatuses(request.user.clinicId);
    return reply.send({ success: true, updated });
  });
}
