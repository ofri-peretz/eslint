/**
 * VULNERABLE - The sink name reached through a const binding.
 */
const PROP = 'innerHTML';
document.getElementById('out')[PROP] = payload;
