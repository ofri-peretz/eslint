/**
 * VULNERABLE - A LOCAL function merely NAMED like a sanitiser. The allowlist is by name, so this is the evasion it invites.
 */
const escapeHtml = (s) => s;
document.querySelector('#bio').innerHTML = escapeHtml(user.bio);
