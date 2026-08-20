/**
 * VULNERABLE - Credentials in a navigation target. The complementary finding
 * from no-insecure-redirects is about the destination; this one is about the
 * secret, and the two have different fixes.
 */
window.location.href = 'https://admin:rootpw@console.acme-corp.io/';
