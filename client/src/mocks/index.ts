export { handlers } from './handlers';
export { worker } from './browser';
// Note: server.ts should only be imported in test environment
// export { server } from './server';

/**
 * Initialize MSW for browser environment
 * Call this function before rendering the app
 */
export async function initMocks(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const { worker } = await import('./browser');

  await worker.start({
    onUnhandledRequest: 'bypass', // Don't warn for unhandled requests (e.g., static assets)
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  // eslint-disable-next-line no-console
  console.log('[MSW] Mock Service Worker started');
}
