/**
 * VULNERABLE - Ternary: one branch is attacker-controlled.
 */
el.innerHTML = isTrusted ? staticMarkup : untrustedMarkup;
