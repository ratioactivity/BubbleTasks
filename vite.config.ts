import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_APP_BASE_URL || '/';

  return {
    base,
    plugins: [react()],
    build: {
      target: 'es2020',
      sourcemap: false,
      assetsDir: 'assets',
      chunkSizeWarningLimit: 800,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  };
});
