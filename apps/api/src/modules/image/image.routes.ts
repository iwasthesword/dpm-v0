import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { uploadFile, deleteFile } from '../../integrations/storage/minio.js';
import { createId } from '@paralleldrive/cuid2';

export async function imageRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get patient images
  fastify.get<{ Params: { patientId: string }; Querystring: { type?: string } }>(
    '/patients/:patientId/images',
    async (request, reply) => {
      const { patientId } = request.params;
      const { type } = request.query;

      const where: Record<string, unknown> = {
        patientId,
        clinicId: request.user.clinicId,
      };

      if (type) {
        where.type = type;
      }

      const images = await fastify.prisma.patientImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, images });
    }
  );

  // Upload patient image
  fastify.post<{ Params: { patientId: string } }>(
    '/patients/:patientId/images',
    async (request, reply) => {
      const { patientId } = request.params;

      // Verify patient belongs to clinic
      const patient = await fastify.prisma.patient.findFirst({
        where: { id: patientId, clinicId: request.user.clinicId },
      });

      if (!patient) {
        return reply.status(404).send({ success: false, error: 'Patient not found' });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ success: false, error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const fileExt = data.filename.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${createId()}.${fileExt}`;
      const folder = `clinics/${request.user.clinicId}/patients/${patientId}`;

      // Determine image type from content type
      let imageType = 'PHOTO';
      if (data.mimetype.includes('pdf')) {
        imageType = 'DOCUMENT';
      } else if (data.filename.toLowerCase().includes('xray') || data.filename.toLowerCase().includes('raio')) {
        imageType = 'XRAY';
      } else if (data.filename.toLowerCase().includes('panoramic') || data.filename.toLowerCase().includes('panoramica')) {
        imageType = 'PANORAMIC';
      }

      // Get form fields
      const fields = data.fields as Record<string, { value?: string }>;
      const type = fields.type?.value || imageType;
      const category = fields.category?.value;
      const tooth = fields.tooth?.value;
      const notes = fields.notes?.value;

      try {
        const url = await uploadFile(buffer, fileName, data.mimetype, folder);

        const image = await fastify.prisma.patientImage.create({
          data: {
            clinicId: request.user.clinicId,
            patientId,
            type: type as 'PHOTO' | 'XRAY' | 'PANORAMIC' | 'CT' | 'DOCUMENT' | 'OTHER',
            category,
            url,
            tooth,
            notes,
            uploadedBy: request.user.userId,
          },
        });

        return reply.status(201).send({ success: true, image });
      } catch (error) {
        console.error('Failed to upload image:', error);
        return reply.status(500).send({ success: false, error: 'Failed to upload image' });
      }
    }
  );

  // Delete patient image
  fastify.delete<{ Params: { patientId: string; imageId: string } }>(
    '/patients/:patientId/images/:imageId',
    async (request, reply) => {
      const { imageId } = request.params;

      const image = await fastify.prisma.patientImage.findFirst({
        where: { id: imageId, clinicId: request.user.clinicId },
      });

      if (!image) {
        return reply.status(404).send({ success: false, error: 'Image not found' });
      }

      try {
        // Extract key from URL
        const urlParts = image.url.split('/');
        const key = urlParts.slice(-4).join('/'); // clinics/xxx/patients/xxx/filename

        await deleteFile(key);
        await fastify.prisma.patientImage.delete({ where: { id: imageId } });

        return reply.send({ success: true });
      } catch (error) {
        console.error('Failed to delete image:', error);
        return reply.status(500).send({ success: false, error: 'Failed to delete image' });
      }
    }
  );

  // Update image metadata
  fastify.patch<{
    Params: { patientId: string; imageId: string };
    Body: { type?: string; category?: string; tooth?: string; notes?: string };
  }>(
    '/patients/:patientId/images/:imageId',
    async (request, reply) => {
      const { imageId } = request.params;
      const { type, category, tooth, notes } = request.body;

      const image = await fastify.prisma.patientImage.findFirst({
        where: { id: imageId, clinicId: request.user.clinicId },
      });

      if (!image) {
        return reply.status(404).send({ success: false, error: 'Image not found' });
      }

      const updatedImage = await fastify.prisma.patientImage.update({
        where: { id: imageId },
        data: {
          type: type as 'PHOTO' | 'XRAY' | 'PANORAMIC' | 'CT' | 'DOCUMENT' | 'OTHER' | undefined,
          category,
          tooth,
          notes,
        },
      });

      return reply.send({ success: true, image: updatedImage });
    }
  );
}
