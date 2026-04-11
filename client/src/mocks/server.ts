import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Test server for MSW
 * Used in unit tests to mock API responses
 */
export const server = setupServer(...handlers);
