/**
 * SAFE - A COUNT of tokens is a number.
 */
const store = tx.objectStore('metrics');
store.put({ id: 1, tokenCount: 3 });
