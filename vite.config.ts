import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  // N197: build de produção sem VITE_API_URL publicaria um painel que chama "localhost".
  if (command === 'build') {
    const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
    if (!env.VITE_API_URL) {
      throw new Error(
        'VITE_API_URL não definida: configure a URL do backend (ex.: https://api.seu-dominio.com.br) ' +
          'no .env.production ou nas variáveis de ambiente da Vercel antes do build.',
      );
    }
  }
  return {
    plugins: [react()],
    server: { port: 5173 },
  };
});
