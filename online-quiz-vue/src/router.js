import { createRouter, createWebHistory } from 'vue-router'
import Login from './pages/Login.vue'
import Quiz from './pages/Quiz.vue'
import Admin from './pages/Admin.vue'

const routes = [
  { path: '/', name: 'login', component: Login },
  { path: '/quiz', name: 'quiz', component: Quiz },
  { path: '/admin', name: 'admin', component: Admin },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

