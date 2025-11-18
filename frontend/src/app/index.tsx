import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../shared/config/i18n';
import '../shared/config/styles';
import { AppProviders } from './providers/AppProviders';
import { Router } from './router';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <Router />
    </AppProviders>
  </StrictMode>
);
