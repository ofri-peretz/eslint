/**
 * VULNERABLE - Store names are almost always plural. "credentials" is the
 * credential store.
 */
db.createObjectStore('credentials', { keyPath: 'id' });
