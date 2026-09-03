/**
 * SAFE - Deleting the session cookie is the remediation, not the defect.
 */
document.cookie = 'sid=; Max-Age=0; Path=/';
document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
