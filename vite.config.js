import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],

    base: '/dv1677-ht26-grupp8-frontend/',

    server: {
      port: 5173,
      
      proxy: {
        '/api': {
          target: env.DEV_API_PROXY || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
})