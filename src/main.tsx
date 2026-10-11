import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErroBoundary } from './components/ErroBoundary';
import './index.css';
import { iniciarRecuperacaoDeAba } from './utils/recuperacaoDeAba';

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
