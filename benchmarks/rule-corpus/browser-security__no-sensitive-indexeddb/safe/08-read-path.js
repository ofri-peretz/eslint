/**
 * SAFE - Reading is not storing.
 */
const store = tx.objectStore('vault');
const request = store.get('password');
export { request };
