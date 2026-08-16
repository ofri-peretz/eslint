/**
 * SAFE - The sink appears only in a comment.
 */
// document.cookie = 'access_token=' + t is never HttpOnly; let the server set it.
document.cookie = 'consent=analytics; Secure; SameSite=Lax';
