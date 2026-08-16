/**
 * SAFE - The okta-signin-widget shape: a constant named after the storage API,
 * holding a key that matches nothing and a timestamp for a value.
 */
const RESEND_TIMESTAMP_SESSION_STORAGE_KEY = 'osw-oie-resend-timestamp';
sessionStorage.setItem(RESEND_TIMESTAMP_SESSION_STORAGE_KEY, String(Date.now()));
