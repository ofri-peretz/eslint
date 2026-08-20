/**
 * VULNERABLE (wave 2) - The storage area pulled off window by destructuring,
 * which is a common SSR-safety pattern.
 */
const { localStorage: store } = window;
store.setItem('id_token', token);
