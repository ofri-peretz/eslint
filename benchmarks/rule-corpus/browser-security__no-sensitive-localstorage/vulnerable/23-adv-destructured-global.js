/**
 * VULNERABLE (wave 2) - The storage area destructured off window.
 */
const { localStorage: store } = window;
store.setItem('private_key', pem);
