/**
 * VULNERABLE - The canonical sink: attacker-controlled value straight into innerHTML.
 */
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greet').innerHTML = name;
