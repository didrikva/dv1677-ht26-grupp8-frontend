import { createRouter, createWebHistory } from 'vue-router'
import ResourceList from '../components/ResourceList.vue'
import ResourceDetail from '../components/ResourceDetail.vue'

const routes = [
  {
    path: '/',
    component: ResourceList
  },
  {
    path: '/resurser/:id',
    component: ResourceDetail
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router