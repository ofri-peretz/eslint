/**
 * SAFE - A record we cannot read. Abstaining is correct; guessing is how a rule
 * ends up reporting something it cannot justify.
 */
const store = tx.objectStore('vault');
store.put(record);
