/**
 * VULNERABLE - ADVERSARIAL. The password arrives by interpolation. The
 * userinfo POSITION is what makes this CWE-521; whether the secret is spelled
 * out or substituted changes nothing about where it ends up.
 */
const password = process.env.SVC_PASSWORD;
fetch(`https://svc:${password}@internal.acme-corp.io/api`);
