import { defineConfig } from 'vitest/config';

// Fuso fixo: várias funções do painel usam o relógio local do navegador.
process.env.TZ = 'America/Sao_Paulo';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
