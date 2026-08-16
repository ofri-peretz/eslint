/**
 * SAFE - `window.`-prefixed global with the correct scheme.
 */
export const metrics = new window.WebSocket('wss://metrics.acme-corp.io/live');
