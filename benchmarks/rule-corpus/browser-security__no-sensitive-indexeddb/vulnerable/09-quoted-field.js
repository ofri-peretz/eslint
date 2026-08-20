/**
 * VULNERABLE - A quoted property key is the same field.
 */
const store = tx.objectStore('vault');
store.put({ 'encryption_key': derived });
