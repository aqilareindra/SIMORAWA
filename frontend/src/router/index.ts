import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
import { message } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/types/auth';
import MainLayout from '@/layouts/MainLayout.vue';
import LoginView from '@/views/LoginView.vue';
import DashboardView from '@/views/DashboardView.vue';
import WorkProgramListView from '@/views/work-programs/WorkProgramListView.vue';
import WorkProgramDetailView from '@/views/work-programs/WorkProgramDetailView.vue';
import EvaluationsView from '@/views/evaluations/EvaluationsView.vue';
import FinanceView from '@/views/finance/FinanceView.vue';
import UserManagementView from '@/views/users/UserManagementView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      guestOnly: true,
      title: 'Masuk ke SIMORAWA',
    },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: {
          requiresAuth: true,
          title: 'Dashboard Monitoring',
          roles: [
            'ADMIN',
            'BPH',
            'KADIV',
            'PIC',
            'BENDAHARA',
            'SEKRETARIS',
          ] as Role[],
        },
      },
      {
        path: 'work-programs',
        name: 'WorkPrograms',
        component: WorkProgramListView,
        meta: {
          requiresAuth: true,
          title: 'Program Kerja',
          roles: [
            'ADMIN',
            'BPH',
            'KADIV',
            'PIC',
            'BENDAHARA',
            'SEKRETARIS',
          ] as Role[],
        },
      },
      {
        path: 'work-programs/:id',
        name: 'WorkProgramDetail',
        component: WorkProgramDetailView,
        meta: {
          requiresAuth: true,
          title: 'Detail Program Kerja',
          roles: [
            'ADMIN',
            'BPH',
            'KADIV',
            'PIC',
            'BENDAHARA',
            'SEKRETARIS',
          ] as Role[],
        },
      },
      {
        path: 'evaluations',
        name: 'Evaluations',
        component: EvaluationsView,
        meta: {
          requiresAuth: true,
          title: 'Evaluasi Proker',
          roles: ['ADMIN', 'BPH', 'KADIV', 'SEKRETARIS'] as Role[],
        },
      },
      {
        path: 'finance',
        name: 'Finance',
        component: FinanceView,
        meta: {
          requiresAuth: true,
          title: 'Anggaran & Kas',
          roles: ['ADMIN', 'BPH', 'KADIV', 'BENDAHARA', 'SEKRETARIS'] as Role[],
        },
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: UserManagementView,
        meta: {
          requiresAuth: true,
          title: 'Kelola Pengguna',
          roles: ['ADMIN'] as Role[],
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ path: '/login' });
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ path: '/dashboard' });
  }

  const allowedRoles = to.meta.roles as Role[] | undefined;
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    authStore.userRole &&
    !allowedRoles.includes(authStore.userRole)
  ) {
    message.warning('Anda tidak memiliki akses untuk membuka halaman tersebut.');
    return next({ path: '/dashboard' });
  }

  return next();
});

export default router;
