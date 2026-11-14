import { createRequire } from 'node:module'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const require = createRequire(import.meta.url)
const vigiaMockApi = require('./server/vite-mock-api.cjs')

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env = {...loadEnv(mode, process.cwd(), ''), ...process.env}
  return {
  base: './',
  // vigiaMockApi serves the json-server mock API at /api/v1 while running `npm run dev`
  plugins: [vue(), ...(env.VITE_USE_IN_MEMORY_API === 'true' ? [vigiaMockApi()] : [])],
  server: { proxy: { '/api/v1': {target: env.VITE_BACKEND_URL || 'http://localhost:5125', changeOrigin: true} } },
  }
})
