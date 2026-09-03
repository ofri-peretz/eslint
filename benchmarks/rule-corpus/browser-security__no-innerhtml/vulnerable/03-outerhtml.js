/**
 * VULNERABLE - outerHTML replaces the element and parses HTML identically to innerHTML.
 */
function swap(el, markup) {
  el.outerHTML = markup;
}
