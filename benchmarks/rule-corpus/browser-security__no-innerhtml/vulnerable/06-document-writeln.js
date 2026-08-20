/**
 * VULNERABLE - writeln is document.write with a newline.
 */
document.writeln('<div>' + window.location.hash.slice(1) + '</div>');
