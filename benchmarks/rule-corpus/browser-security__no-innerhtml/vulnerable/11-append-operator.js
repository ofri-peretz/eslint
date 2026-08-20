/**
 * VULNERABLE - += parses the appended fragment as HTML too.
 */
document.getElementById('log').innerHTML += '<li>' + entry.message + '</li>';
