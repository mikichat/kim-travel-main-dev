import { itineraryHandlers } from './itineraries';
import { itineraryItemHandlers } from './itineraryItems';
import { hotelHandlers } from './hotels';
import { imageHandlers } from './images';
import { authHandlers } from './auth';

/**
 * Combined handlers for all API endpoints
 * Used by both browser worker and test server
 */
export const handlers = [
  ...authHandlers,
  ...itineraryHandlers,
  ...itineraryItemHandlers,
  ...hotelHandlers,
  ...imageHandlers,
];
