import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // During development, any request to /api is forwarded to the Express
    // server. To the browser, the API looks like it's on the same site as the
    // React app, so the "sameSite: strict" auth cookie just works.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
