import { defineConfig } from "vite"
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://0.0.0.0:8000', // FastAPI server address
        changeOrigin: true,
      }
    },
  },
  plugins: [ mkcert() ]
});
