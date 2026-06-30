import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_PROXY_API || 'http://localhost:5050';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /** Listen on all network interfaces so phones/tablets on the same Wi‑Fi can open http://<your-pc-ip>:5173 */
    host: true,
    strictPort: true,
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: true },
      '/socket.io': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});
