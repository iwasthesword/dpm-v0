import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { CampaignService } from './campaign.service.js';

export async function campaignRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  const campaignService = new CampaignService(fastify.prisma);

  // ==================== SEGMENTS ====================

  // List all segments
  fastify.get('/segments', {
    handler: async (request, reply) => {
      const segments = await campaignService.listSegments(request.user.clinicId);
      return reply.send({ success: true, segments });
    },
  });

  // Get segment by ID
  fastify.get<{ Params: { id: string } }>('/segments/:id', {
    handler: async (request, reply) => {
      const segment = await campaignService.getSegment(
        request.user.clinicId,
        request.params.id
      );

      if (!segment) {
        return reply.status(404).send({ success: false, error: 'Segment not found' });
      }

      return reply.send({ success: true, segment });
    },
  });

  // Create segment
  fastify.post('/segments', {
    handler: async (request, reply) => {
      const body = request.body as any;

      const segment = await campaignService.createSegment(request.user.clinicId, {
        name: body.name,
        description: body.description,
        filters: body.filters || {},
        isActive: body.isActive,
      });

      return reply.status(201).send({ success: true, segment });
    },
  });

  // Update segment
  fastify.put<{ Params: { id: string } }>('/segments/:id', {
    handler: async (request, reply) => {
      const body = request.body as any;

      const segment = await campaignService.updateSegment(
        request.user.clinicId,
        request.params.id,
        {
          name: body.name,
          description: body.description,
          filters: body.filters,
          isActive: body.isActive,
        }
      );

      if (!segment) {
        return reply.status(404).send({ success: false, error: 'Segment not found' });
      }

      return reply.send({ success: true, segment });
    },
  });

  // Delete segment
  fastify.delete<{ Params: { id: string } }>('/segments/:id', {
    handler: async (request, reply) => {
      try {
        const deleted = await campaignService.deleteSegment(
          request.user.clinicId,
          request.params.id
        );

        if (!deleted) {
          return reply.status(404).send({ success: false, error: 'Segment not found' });
        }

        return reply.send({ success: true });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Preview segment (get matching patients)
  fastify.post<{ Params: { id: string } }>('/segments/:id/preview', {
    handler: async (request, reply) => {
      const segment = await campaignService.getSegment(
        request.user.clinicId,
        request.params.id
      );

      if (!segment) {
        return reply.status(404).send({ success: false, error: 'Segment not found' });
      }

      const preview = await campaignService.previewSegment(
        request.user.clinicId,
        segment.filters
      );

      return reply.send({ success: true, preview });
    },
  });

  // Preview segment by filters (without saving)
  fastify.post('/segments/preview', {
    handler: async (request, reply) => {
      const { filters } = request.body as any;

      const preview = await campaignService.previewSegment(
        request.user.clinicId,
        filters || {}
      );

      return reply.send({ success: true, preview });
    },
  });

  // ==================== CAMPAIGNS ====================

  // List all campaigns
  fastify.get('/campaigns', {
    handler: async (request, reply) => {
      const { status } = request.query as any;

      const campaigns = await campaignService.listCampaigns(
        request.user.clinicId,
        status
      );

      return reply.send({ success: true, campaigns });
    },
  });

  // Get campaign by ID
  fastify.get<{ Params: { id: string } }>('/campaigns/:id', {
    handler: async (request, reply) => {
      const campaign = await campaignService.getCampaign(
        request.user.clinicId,
        request.params.id
      );

      if (!campaign) {
        return reply.status(404).send({ success: false, error: 'Campaign not found' });
      }

      return reply.send({ success: true, campaign });
    },
  });

  // Create campaign
  fastify.post('/campaigns', {
    handler: async (request, reply) => {
      const body = request.body as any;

      try {
        const campaign = await campaignService.createCampaign(
          request.user.clinicId,
          request.user.userId,
          {
            segmentId: body.segmentId,
            name: body.name,
            description: body.description,
            type: body.type,
            channel: body.channel,
            subject: body.subject,
            content: body.content,
            audioUrl: body.audioUrl,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
          }
        );

        return reply.status(201).send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Update campaign
  fastify.put<{ Params: { id: string } }>('/campaigns/:id', {
    handler: async (request, reply) => {
      const body = request.body as any;

      try {
        const campaign = await campaignService.updateCampaign(
          request.user.clinicId,
          request.params.id,
          {
            name: body.name,
            description: body.description,
            type: body.type,
            channel: body.channel,
            subject: body.subject,
            content: body.content,
            audioUrl: body.audioUrl,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
          }
        );

        if (!campaign) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Delete campaign
  fastify.delete<{ Params: { id: string } }>('/campaigns/:id', {
    handler: async (request, reply) => {
      try {
        const deleted = await campaignService.deleteCampaign(
          request.user.clinicId,
          request.params.id
        );

        if (!deleted) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // ==================== CAMPAIGN LIFECYCLE ====================

  // Schedule campaign
  fastify.post<{ Params: { id: string } }>('/campaigns/:id/schedule', {
    handler: async (request, reply) => {
      const { scheduledFor } = request.body as any;

      if (!scheduledFor) {
        return reply.status(400).send({
          success: false,
          error: 'scheduledFor is required',
        });
      }

      try {
        const campaign = await campaignService.scheduleCampaign(
          request.user.clinicId,
          request.params.id,
          new Date(scheduledFor)
        );

        if (!campaign) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Start campaign immediately
  fastify.post<{ Params: { id: string } }>('/campaigns/:id/start', {
    handler: async (request, reply) => {
      try {
        const campaign = await campaignService.startCampaign(
          request.user.clinicId,
          request.params.id
        );

        if (!campaign) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Pause campaign
  fastify.post<{ Params: { id: string } }>('/campaigns/:id/pause', {
    handler: async (request, reply) => {
      try {
        const campaign = await campaignService.pauseCampaign(
          request.user.clinicId,
          request.params.id
        );

        if (!campaign) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Resume campaign
  fastify.post<{ Params: { id: string } }>('/campaigns/:id/resume', {
    handler: async (request, reply) => {
      try {
        const campaign = await campaignService.resumeCampaign(
          request.user.clinicId,
          request.params.id
        );

        if (!campaign) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Cancel campaign
  fastify.post<{ Params: { id: string } }>('/campaigns/:id/cancel', {
    handler: async (request, reply) => {
      try {
        const campaign = await campaignService.cancelCampaign(
          request.user.clinicId,
          request.params.id
        );

        if (!campaign) {
          return reply.status(404).send({ success: false, error: 'Campaign not found' });
        }

        return reply.send({ success: true, campaign });
      } catch (error: any) {
        return reply.status(400).send({ success: false, error: error.message });
      }
    },
  });

  // Get campaign analytics
  fastify.get<{ Params: { id: string } }>('/campaigns/:id/analytics', {
    handler: async (request, reply) => {
      const analytics = await campaignService.getCampaignAnalytics(
        request.user.clinicId,
        request.params.id
      );

      if (!analytics) {
        return reply.status(404).send({ success: false, error: 'Campaign not found' });
      }

      return reply.send({ success: true, analytics });
    },
  });
}
