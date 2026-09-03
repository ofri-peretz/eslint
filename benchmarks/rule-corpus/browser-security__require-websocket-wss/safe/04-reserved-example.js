/**
 * SAFE - RFC 2606 reserves these names, so they can never resolve to a real
 * service and there is no transmission to intercept.
 */
export const sample = new WebSocket('ws://example.com/socket');
