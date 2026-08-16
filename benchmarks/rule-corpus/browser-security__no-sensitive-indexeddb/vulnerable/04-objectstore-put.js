/**
 * VULNERABLE - The record's own field names the secret, and `store` resolves
 * back to an objectStore() call, which is what proves this is a database.
 */
const tx = db.transaction('wallet', 'readwrite');
const store = tx.objectStore('wallet');
store.put({ id: 1, seed_phrase: wallet.mnemonic });
