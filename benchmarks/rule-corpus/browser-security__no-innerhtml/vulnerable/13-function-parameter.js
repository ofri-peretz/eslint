/**
 * VULNERABLE - The value arrives as a parameter - provenance is outside the file.
 */
export function paint(el, htmlFromServer) {
  el.innerHTML = htmlFromServer;
}
