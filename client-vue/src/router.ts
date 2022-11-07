import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
    {
        name: 'home',
        path: '/',
        component: () => import('./views/home.vue')
    },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export { router }