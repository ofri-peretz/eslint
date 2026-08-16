/**
 * VULNERABLE (wave 2) - "SameSite" with no value is not a valid attribute;
 * browsers ignore it. A test that only looks for the word goes quiet.
 */
document.cookie = 'a=b; Secure; SameSite';
