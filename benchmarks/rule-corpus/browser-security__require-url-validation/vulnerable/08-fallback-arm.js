/**
 * VULNERABLE - Either arm of the fallback can be the result, and the first is
 * attacker-chosen.
 */
window.open(window.location.hash || '/home', '_blank', 'noopener');
