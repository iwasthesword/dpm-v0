import type { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth/auth.routes.js';
import { clinicRoutes } from './modules/clinic/clinic.routes.js';
import { patientRoutes } from './modules/patient/patient.routes.js';
import { appointmentRoutes } from './modules/appointment/appointment.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { ehrRoutes } from './modules/ehr/ehr.routes.js';
import { imageRoutes } from './modules/image/image.routes.js';
import { documentRoutes } from './modules/document/document.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { financialRoutes } from './modules/financial/financial.routes.js';
import { messageRoutes } from './modules/message/message.routes.js';
import { surveyRoutes } from './modules/survey/survey.routes.js';
import { campaignRoutes } from './modules/campaign/campaign.routes.js';
import { complianceRoutes } from './modules/compliance/compliance.routes.js';
import { reportRoutes } from './modules/report/report.routes.js';
import { helpRoutes } from './modules/help/help.routes.js';
import { supportRoutes } from './modules/support/support.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { subscriptionRoutes } from './modules/subscription/subscription.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { adminAuthRoutes } from './modules/admin/admin-auth.routes.js';
import { adminClinicsRoutes } from './modules/admin/admin-clinics.routes.js';
import { adminDashboardRoutes } from './modules/admin/admin-dashboard.routes.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes with /api prefix
  fastify.register(
    async (api) => {
      // Public routes (no auth required)
      api.register(publicRoutes, { prefix: '/public' });

      // Auth routes
      api.register(authRoutes, { prefix: '/auth' });

      // Subscription & onboarding
      api.register(subscriptionRoutes, { prefix: '/subscription' });
      api.register(onboardingRoutes, { prefix: '/onboarding' });

      // Core app routes
      api.register(dashboardRoutes, { prefix: '/dashboard' });
      api.register(clinicRoutes, { prefix: '/clinics' });
      api.register(patientRoutes, { prefix: '/patients' });
      api.register(appointmentRoutes, { prefix: '/appointments' });
      api.register(ehrRoutes, { prefix: '/ehr' });
      api.register(imageRoutes, { prefix: '/images' });
      api.register(documentRoutes, { prefix: '/documents' });
      api.register(staffRoutes, { prefix: '/staff' });
      api.register(financialRoutes, { prefix: '/financial' });
      api.register(messageRoutes, { prefix: '/messages' });
      api.register(surveyRoutes, { prefix: '/surveys' });
      api.register(campaignRoutes, { prefix: '/campaigns' });
      api.register(complianceRoutes, { prefix: '/compliance' });
      api.register(reportRoutes, { prefix: '/reports' });
      api.register(helpRoutes, { prefix: '/help' });
      api.register(supportRoutes, { prefix: '/support' });

      // Super admin routes
      api.register(adminAuthRoutes, { prefix: '/admin/auth' });
      api.register(adminClinicsRoutes, { prefix: '/admin/clinics' });
      api.register(adminDashboardRoutes, { prefix: '/admin/dashboard' });
    },
    { prefix: '/api' }
  );
}
