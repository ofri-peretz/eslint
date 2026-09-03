/**
 * SAFE - The remediation. Only an opaque server-issued handle is cached
 * offline; the secret itself never leaves the server.
 */
const store = tx.objectStore('sync-queue');
store.put({ id: 1, handle: response.opaqueHandle });
