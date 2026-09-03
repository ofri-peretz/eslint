/**
 * SAFE - The okta-signin-widget shape. The CONSTANT is named after the storage
 * API; the key it resolves to matches nothing, and the value is a page URL.
 */
const LAST_INITIATED_LOGIN_URL_LOCAL_STORAGE_KEY = 'osw-oie-last-initiated-login-url';
localStorage.setItem(LAST_INITIATED_LOGIN_URL_LOCAL_STORAGE_KEY, window.location.href);
