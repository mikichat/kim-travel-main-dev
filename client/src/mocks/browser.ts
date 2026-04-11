import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Browser worker for MSW
 * Used in development mode to intercept network requests
 */
export const worker = setupWorker(...handlers);
