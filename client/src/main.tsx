import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Initialize MSW in development mode when VITE_ENABLE_MOCKS is true
 */
async function enableMocking(): Promise<void> {
  // Only enable mocking in development and when explicitly enabled
  if (
    import.meta.env.MODE !== 'development' ||
    import.meta.env.VITE_ENABLE_MOCKS !== 'true'
  ) {
    return;
  }

  const { initMocks } = await import('./mocks');
  await initMocks();
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Wait for MSW to initialize before rendering
enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
