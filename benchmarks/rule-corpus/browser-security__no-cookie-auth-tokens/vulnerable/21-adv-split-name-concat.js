/**
 * VULNERABLE (wave 2) - The cookie NAME itself split across a concatenation.
 */
document.cookie = 'access' + '_token=' + token + '; Secure; SameSite=Lax';
