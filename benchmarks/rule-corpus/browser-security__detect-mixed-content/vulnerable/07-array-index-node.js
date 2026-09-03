/**
 * VULNERABLE - The node is reached by array index off a live NodeList. The
 * receiver is not a named element binding at all.
 */
const slots = document.querySelectorAll('.ad-slot');
slots[0].src = 'http://ads.acme-corp.io/slot.html';
