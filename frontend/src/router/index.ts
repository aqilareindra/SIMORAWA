import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { defineComponent, h } from 'vue';

const WelcomePlaceholder = defineComponent({
  name: 'WelcomePlaceholder',
  setup() {
    return () =>
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#F9F7F7',
            color: '#112D4E',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          },
        },
        [
          h('h1', { style: { marginBottom: '8px', color: '#112D4E' } }, 'SIMORAWA - HIMA IF UISI'),
          h('p', { style: { color: '#3F72AF', margin: 0 } }, 'Frontend berhasil diinisialisasi (Vue 3 + Vite + Ant Design Vue v4).'),
        ],
      );
  },
});

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: WelcomePlaceholder,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
