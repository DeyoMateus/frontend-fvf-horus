import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErroBoundary } from './components/ErroBoundary';
import './index.css';
import { iniciarRecuperacaoDeAba } from './utils/recuperacaoDeAba';

// Rodada 292: monitoramento de erros do painel (só liga com VITE_SENTRY_DSN).
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    tracesSampleRate: 0,
    beforeSend(evento) {
      if (evento.request) {
        delete evento.request.cookies;
        delete evento.request.headers;
        delete evento.request.data;
      }
      evento.user = undefined;
      return evento;
    },
  });
}

iniciarRecuperacaoDeAba();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErroBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErroBoundary>
  </StrictMode>,
);
