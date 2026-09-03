/**
 * VULNERABLE - Cleartext AND credentialled. The scheme does not change whether
 * the userinfo is a password.
 */
const MIRROR = 'http://deploy:rollout99@artifacts.acme-corp.io/nightly';
downloadFrom(MIRROR);
