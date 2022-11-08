import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { router } from '@/router.js'

import '@arco-design/web-vue/dist/arco.css';

createApp(App).use(router).use(createPinia()).mount('#app')
