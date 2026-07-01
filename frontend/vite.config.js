import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_PROXY_API || 'http://localhost:5050';

export default defineConfig({
  base: '/healthcare/',
  plugins: [react()],
  server: {
    port: 5173,
    /** Listen on all network interfaces so phones/tablets on the same Wi‑Fi can open http://<your-pc-ip>:5173 */
    host: true,
    strictPort: true,
    proxy: {
      // Frontend calls /healthcare/api & /healthcare/socket.io (see src/lib/api.js, src/lib/socket.js);
      // strip the /healthcare prefix before forwarding to the backend, which only knows /api & /socket.io.
      '/healthcare/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/healthcare/, ''),
      },
      '/healthcare/socket.io': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/healthcare/, ''),
      },
    },
  },
});
