/**
 * VULNERABLE (wave 2) - THE FALSE-NEGATIVE DIRECTION. The cookie NAME is the
 * evidence and it survives the rename.
 */
const a = await b();
document.cookie = 'sid=' + a.c + '; Secure; SameSite=Strict';
