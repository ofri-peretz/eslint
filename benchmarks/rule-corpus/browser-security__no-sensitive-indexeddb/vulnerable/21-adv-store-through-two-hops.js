/**
 * VULNERABLE (wave 2) - The object store reached through two bindings.
 */
const tx = db.transaction('vault', 'readwrite');
const store = tx.objectStore('vault');
const target = store;
target.put({ id: 1, api_key: integration.key });
