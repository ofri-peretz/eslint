/**
 * VULNERABLE (wave 2) - THE FALSE-NEGATIVE DIRECTION. Every identifier renamed
 * to something meaningless; the key is unchanged.
 */
const a = document.querySelector('#f');
localStorage.setItem('ssn', a.value);
