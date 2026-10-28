import { createRouter, createWebHistory } from 'vue-router'
import ResourceList from '../components/ResourceList.vue'
import ResourceDetail from '../components/ResourceDetail.vue'
import loginPage from '../components/loginPage.vue'
import MyBookings from '../components/MyBookings.vue'
import { useAuth } from '../composables/useAuth.js'

const routes = [
  {
    path: '/',
    component: ResourceList
  },
  {
    path: '/resurser/:id',
    component: ResourceDetail
  },
  {
    path: '/login',
    component: loginPage
  },
  {
    path: '/mina-bokningar',
    component: MyBookings,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Döljer bara gränssnittet. Backend kontrollerar token på riktigt.
router.beforeEach((to) => {
  const { token } = useAuth()

  if (to.meta.requiresAuth && !token.value) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router