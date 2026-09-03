/**
 * SAFE - A template literal with an interpolated PATH, not userinfo. The
 * authority is fixed and carries no credential.
 */
const id = getUserId();
fetch(`https://api.acme-corp.io/v1/users/${id}`);
