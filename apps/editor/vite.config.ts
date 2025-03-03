import { defineConfig } from "vite"
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://prime-lab.cs.vt.edu:8000', // FastAPI server address
        changeOrigin: true,
      }
    },
  },
  plugins: [ mkcert() ]
});
