/**
 * SAFE - textContent never parses HTML - the standard remediation.
 */
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greet').textContent = name;
