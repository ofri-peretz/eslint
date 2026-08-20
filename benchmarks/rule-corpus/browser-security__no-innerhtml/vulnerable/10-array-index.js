/**
 * VULNERABLE - Element reached through an index, not a plain identifier.
 */
const cells = document.querySelectorAll('td');
cells[0].innerHTML = incoming;
