/**
 * SAFE - The sink name appears only in a comment.
 */
// Do not use innerHTML here; textContent is required for untrusted input.
el.textContent = payload;
