/**
 * VULNERABLE - A replace() blacklist is not sanitisation; the value still reaches the sink.
 */
const cleaned = comment.replace(/<script>/gi, '');
document.querySelector('#comments').innerHTML = cleaned;
