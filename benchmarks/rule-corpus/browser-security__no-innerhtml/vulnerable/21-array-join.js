/**
 * VULNERABLE - Markup assembled from an array of attacker-controlled parts.
 */
el.innerHTML = items.map((i) => '<li>' + i.label + '</li>').join('');
