import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes (no auth required)
    {
      path: '/landing',
      name: 'landing',
      component: () => import('@/modules/public/LandingPage.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/modules/public/RegisterPage.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/modules/auth/ForgotPasswordPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/modules/auth/ResetPasswordPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/2fa',
      name: '2fa',
      component: () => import('@/modules/auth/TwoFactorPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/survey/:token',
      name: 'public-survey',
      component: () => import('@/modules/satisfaction/PublicSurveyPage.vue'),
      meta: { public: true },
    },
    // Onboarding (requires auth)
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/modules/onboarding/OnboardingPage.vue'),
      meta: { requiresAuth: true },
    },
    // Super Admin routes
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/modules/admin/AdminLoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/admin',
      component: () => import('@/components/layouts/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/modules/admin/AdminDashboardPage.vue'),
        },
        {
          path: 'clinics',
          name: 'admin-clinics',
          component: () => import('@/modules/admin/AdminClinicsPage.vue'),
        },
        {
          path: 'clinics/:id',
          name: 'admin-clinic-detail',
          component: () => import('@/modules/admin/AdminClinicDetailPage.vue'),
        },
      ],
    },
    {
      path: '/',
      component: () => import('@/components/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/modules/dashboard/DashboardPage.vue'),
        },
        {
          path: 'patients',
          name: 'patients',
          component: () => import('@/modules/patients/PatientsPage.vue'),
        },
        {
          path: 'patients/:id',
          name: 'patient-details',
          component: () => import('@/modules/patients/PatientDetailsPage.vue'),
        },
        {
          path: 'schedule',
          name: 'schedule',
          component: () => import('@/modules/schedule/SchedulePage.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/modules/settings/SettingsPage.vue'),
        },
        {
          path: 'settings/subscription',
          name: 'subscription',
          component: () => import('@/modules/settings/SubscriptionPage.vue'),
        },
        {
          path: 'financial',
          name: 'financial',
          component: () => import('@/modules/financial/FinancialPage.vue'),
        },
        {
          path: 'satisfaction',
          name: 'satisfaction',
          component: () => import('@/modules/satisfaction/SatisfactionPage.vue'),
        },
        {
          path: 'campaigns',
          name: 'campaigns',
          component: () => import('@/modules/campaigns/CampaignsPage.vue'),
        },
        {
          path: 'compliance',
          name: 'compliance',
          component: () => import('@/modules/compliance/CompliancePage.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/modules/reports/ReportsPage.vue'),
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('@/modules/help/HelpPage.vue'),
        },
        {
          path: 'support',
          name: 'support',
          component: () => import('@/modules/help/SupportPage.vue'),
        },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Initialize auth state from storage
  if (!authStore.initialized) {
    await authStore.initialize();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  const isGuestRoute = to.matched.some((record) => record.meta.guest);
  const isPublicRoute = to.matched.some((record) => record.meta.public);

  // Handle admin routes separately
  if (requiresAdmin) {
    const adminToken = localStorage.getItem('adminAccessToken');
    if (!adminToken) {
      next({ name: 'admin-login' });
    } else {
      next();
    }
    return;
  }

  // Public routes bypass auth checks entirely
  if (isPublicRoute) {
    next();
  } else if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (isGuestRoute && authStore.isAuthenticated) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
