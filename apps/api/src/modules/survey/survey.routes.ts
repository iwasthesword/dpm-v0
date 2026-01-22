import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { SurveyService } from './survey.service.js';

export async function surveyRoutes(fastify: FastifyInstance) {
  const surveyService = new SurveyService(fastify.prisma);

  // ==================== AUTHENTICATED ROUTES ====================

  // Apply authentication to most routes
  fastify.register(async (authRoutes) => {
    authRoutes.addHook('preHandler', authenticate);

    // ==================== SURVEYS ====================

    // List all surveys
    authRoutes.get('/surveys', {
      handler: async (request, reply) => {
        const surveys = await surveyService.listSurveys(request.user.clinicId);
        return reply.send({ success: true, surveys });
      },
    });

    // Get survey by ID
    authRoutes.get<{ Params: { id: string } }>('/surveys/:id', {
      handler: async (request, reply) => {
        const survey = await surveyService.getSurvey(
          request.user.clinicId,
          request.params.id
        );

        if (!survey) {
          return reply.status(404).send({ success: false, error: 'Survey not found' });
        }

        return reply.send({ success: true, survey });
      },
    });

    // Create survey
    authRoutes.post('/surveys', {
      handler: async (request, reply) => {
        const body = request.body as any;

        const survey = await surveyService.createSurvey(request.user.clinicId, {
          name: body.name,
          type: body.type,
          description: body.description,
          isActive: body.isActive,
          autoSend: body.autoSend,
          triggerAfterDays: body.triggerAfterDays,
          thankYouMessage: body.thankYouMessage,
          questions: body.questions || [],
        });

        return reply.status(201).send({ success: true, survey });
      },
    });

    // Update survey
    authRoutes.put<{ Params: { id: string } }>('/surveys/:id', {
      handler: async (request, reply) => {
        const body = request.body as any;

        const survey = await surveyService.updateSurvey(
          request.user.clinicId,
          request.params.id,
          {
            name: body.name,
            type: body.type,
            description: body.description,
            isActive: body.isActive,
            autoSend: body.autoSend,
            triggerAfterDays: body.triggerAfterDays,
            thankYouMessage: body.thankYouMessage,
          }
        );

        if (!survey) {
          return reply.status(404).send({ success: false, error: 'Survey not found' });
        }

        return reply.send({ success: true, survey });
      },
    });

    // Delete survey
    authRoutes.delete<{ Params: { id: string } }>('/surveys/:id', {
      handler: async (request, reply) => {
        const deleted = await surveyService.deleteSurvey(
          request.user.clinicId,
          request.params.id
        );

        if (!deleted) {
          return reply.status(404).send({ success: false, error: 'Survey not found' });
        }

        return reply.send({ success: true });
      },
    });

    // ==================== SURVEY QUESTIONS ====================

    // Add question to survey
    authRoutes.post<{ Params: { surveyId: string } }>('/surveys/:surveyId/questions', {
      handler: async (request, reply) => {
        const body = request.body as any;

        const question = await surveyService.addQuestion(
          request.user.clinicId,
          request.params.surveyId,
          {
            type: body.type,
            question: body.question,
            description: body.description,
            options: body.options,
            isRequired: body.isRequired,
            order: body.order,
          }
        );

        if (!question) {
          return reply.status(404).send({ success: false, error: 'Survey not found' });
        }

        return reply.status(201).send({ success: true, question });
      },
    });

    // Update question
    authRoutes.put<{ Params: { questionId: string } }>('/questions/:questionId', {
      handler: async (request, reply) => {
        const body = request.body as any;

        const question = await surveyService.updateQuestion(
          request.user.clinicId,
          request.params.questionId,
          {
            type: body.type,
            question: body.question,
            description: body.description,
            options: body.options,
            isRequired: body.isRequired,
            order: body.order,
          }
        );

        if (!question) {
          return reply.status(404).send({ success: false, error: 'Question not found' });
        }

        return reply.send({ success: true, question });
      },
    });

    // Delete question
    authRoutes.delete<{ Params: { questionId: string } }>('/questions/:questionId', {
      handler: async (request, reply) => {
        const deleted = await surveyService.deleteQuestion(
          request.user.clinicId,
          request.params.questionId
        );

        if (!deleted) {
          return reply.status(404).send({ success: false, error: 'Question not found' });
        }

        return reply.send({ success: true });
      },
    });

    // ==================== SEND SURVEYS ====================

    // Send survey to patient(s)
    authRoutes.post<{ Params: { id: string } }>('/surveys/:id/send', {
      handler: async (request, reply) => {
        const { patientIds, appointmentId } = request.body as any;

        if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'patientIds is required and must be a non-empty array',
          });
        }

        try {
          const results = await surveyService.sendSurvey(
            request.user.clinicId,
            request.params.id,
            patientIds,
            appointmentId
          );

          // Generate public URLs
          const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
          const surveyLinks = results.map((r) => ({
            patientId: r.patientId,
            url: `${baseUrl}/survey/${r.token}`,
          }));

          return reply.send({ success: true, surveyLinks });
        } catch (error: any) {
          return reply.status(400).send({ success: false, error: error.message });
        }
      },
    });

    // ==================== SURVEY RESPONSES ====================

    // Get survey responses
    authRoutes.get('/responses', {
      handler: async (request, reply) => {
        const { surveyId, completed } = request.query as any;

        const responses = await surveyService.getResponses(
          request.user.clinicId,
          surveyId,
          completed === 'true' ? true : completed === 'false' ? false : undefined
        );

        return reply.send({ success: true, responses });
      },
    });

    // Get responses for specific survey
    authRoutes.get<{ Params: { id: string } }>('/surveys/:id/responses', {
      handler: async (request, reply) => {
        const { completed } = request.query as any;

        const responses = await surveyService.getResponses(
          request.user.clinicId,
          request.params.id,
          completed === 'true' ? true : completed === 'false' ? false : undefined
        );

        return reply.send({ success: true, responses });
      },
    });

    // ==================== NPS ANALYTICS ====================

    // Get NPS analytics for a survey
    authRoutes.get<{ Params: { id: string } }>('/surveys/:id/analytics', {
      handler: async (request, reply) => {
        const { startDate, endDate } = request.query as any;

        const analytics = await surveyService.getNPSAnalytics(
          request.user.clinicId,
          request.params.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );

        return reply.send({ success: true, analytics });
      },
    });

    // Get overall NPS analytics
    authRoutes.get('/analytics', {
      handler: async (request, reply) => {
        const { surveyId, startDate, endDate } = request.query as any;

        const analytics = await surveyService.getNPSAnalytics(
          request.user.clinicId,
          surveyId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );

        return reply.send({ success: true, analytics });
      },
    });

    // NPS Dashboard data
    authRoutes.get('/nps/dashboard', {
      handler: async (request, reply) => {
        const dashboard = await surveyService.getNPSDashboard(request.user.clinicId);
        return reply.send({ success: true, dashboard });
      },
    });

    // ==================== ALERTS ====================

    // Get all alerts
    authRoutes.get('/alerts', {
      handler: async (request, reply) => {
        const { status } = request.query as any;

        const alerts = await surveyService.getAlerts(
          request.user.clinicId,
          status
        );

        return reply.send({ success: true, alerts });
      },
    });

    // Update alert
    authRoutes.put<{ Params: { id: string } }>('/alerts/:id', {
      handler: async (request, reply) => {
        const { status, notes } = request.body as any;

        const alert = await surveyService.updateAlert(
          request.user.clinicId,
          request.params.id,
          {
            status,
            notes,
            resolvedBy: request.user.userId,
          }
        );

        if (!alert) {
          return reply.status(404).send({ success: false, error: 'Alert not found' });
        }

        return reply.send({ success: true, alert });
      },
    });
  });

  // ==================== PUBLIC ROUTES (No Auth) ====================

  // Get public survey form
  fastify.get<{ Params: { token: string } }>('/public/:token', {
    handler: async (request, reply) => {
      const result = await surveyService.getPublicSurvey(request.params.token);

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Survey not found' });
      }

      if (result.expired) {
        return reply.status(410).send({ success: false, error: 'Survey has expired' });
      }

      if (result.alreadyCompleted) {
        return reply.status(409).send({
          success: false,
          error: 'Survey already completed',
          thankYouMessage: result.survey.thankYouMessage,
        });
      }

      return reply.send({
        success: true,
        survey: {
          id: result.survey.id,
          name: result.survey.name,
          description: result.survey.description,
          questions: result.survey.questions,
        },
        patientName: result.patientName,
      });
    },
  });

  // Submit public survey response
  fastify.post<{ Params: { token: string } }>('/public/:token', {
    handler: async (request, reply) => {
      const { answers } = request.body as any;

      if (!answers || !Array.isArray(answers)) {
        return reply.status(400).send({
          success: false,
          error: 'answers is required and must be an array',
        });
      }

      const result = await surveyService.submitSurveyResponse(
        request.params.token,
        answers
      );

      if (!result.success) {
        const statusCode =
          result.message === 'Survey not found' ? 404 :
          result.message === 'Survey already completed' ? 409 :
          result.message === 'Survey has expired' ? 410 : 400;

        return reply.status(statusCode).send({
          success: false,
          error: result.message,
        });
      }

      return reply.send({
        success: true,
        message: result.message,
        thankYouMessage: result.thankYouMessage,
      });
    },
  });
}
