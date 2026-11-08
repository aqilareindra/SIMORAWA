import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './style.css';
import App from './App.vue';
import router from './router';
import { simorawaTheme, SIMORAWA_COLORS } from './theme';

const app = createApp(App);
const pinia = createPinia();

app.provide('simorawaTheme', simorawaTheme);
app.provide('simorawaColors', SIMORAWA_COLORS);

app.use(pinia);
app.use(router);
app.use(Antd);

app.mount('#app');
