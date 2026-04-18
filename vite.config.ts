import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    return {
      define: {
        // Versão automática no formato CalVer (AA.MM.DD) — gerada a cada build/deploy
        __APP_VERSION__: JSON.stringify((() => {
          const d = new Date();
          const yy = d.getFullYear().toString().slice(-2);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yy}.${mm}.${dd}`;
        })()),
        __BUILD_DATE__: JSON.stringify(
          new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        ),
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
