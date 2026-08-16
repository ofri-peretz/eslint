/**
 * VULNERABLE (wave 2) - Shorthand property. The field is still named.
 */
const store = tx.objectStore('vault');
const password = form.password;
store.put({ id: 1, password });
