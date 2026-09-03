/**
 * VULNERABLE - document.write parses HTML into the document.
 */
const ref = new URLSearchParams(location.search).get('ref');
document.write('<p>Referred by ' + ref + '</p>');
