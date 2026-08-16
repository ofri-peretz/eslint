/**
 * VULNERABLE - Bearer credentials are in scope here: no other rule covers
 * IndexedDB, so deferring them would be a false negative.
 */
db.createObjectStore('auth-tokens');
