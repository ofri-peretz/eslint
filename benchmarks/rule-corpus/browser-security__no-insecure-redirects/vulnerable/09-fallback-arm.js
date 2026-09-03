/**
 * VULNERABLE - Either arm of the fallback can be the result, and the first one
 * is attacker-chosen.
 */
document.location.href = location.hash || '/dashboard';
