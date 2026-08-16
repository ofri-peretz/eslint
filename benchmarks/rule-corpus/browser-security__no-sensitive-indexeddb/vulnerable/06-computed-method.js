/**
 * VULNERABLE - Computed method access on a proven object store.
 */
const store = tx.objectStore('vault');
store['put']({ id: 2, apiKey: integration.key });
