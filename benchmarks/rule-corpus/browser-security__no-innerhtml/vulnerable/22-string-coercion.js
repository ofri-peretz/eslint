/**
 * VULNERABLE - String() does not sanitise anything.
 */
el.innerHTML = String(new URLSearchParams(location.search).get('q'));
