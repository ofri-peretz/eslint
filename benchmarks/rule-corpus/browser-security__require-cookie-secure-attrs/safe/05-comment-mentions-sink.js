/**
 * SAFE - The sink appears only in a comment.
 */
// document.cookie = 'a=b' with no Secure travels in the clear.
document.cookie = 'a=b; Secure; SameSite=Strict';
