import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { thinkApi } from './server/thinkApi'

export default defineConfig({
  plugins: [react(), thinkApi()],
})
