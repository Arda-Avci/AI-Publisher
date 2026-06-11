import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    proxy: {
      '^/(api|login|logout|opportunity-videos|uploads|videolar|settings|create-job|save-meta|delete-job|retry-job|start-job|cancel-job|select-cover|differentiate-video|differentiate-status|approve-translation)': {
        target: 'http://localhost:3016',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
