/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. The same defect as 01 with every
 * telling identifier renamed. Detection must survive: the evidence is
 * `location.search` reaching `window.open`, not the spelling `popup`.
 */
const c = new URLSearchParams(window.location.search).get('p');
window.open(c, '_blank');
