/**
 * VULNERABLE - the tag is spelled with a `\x3C` escape, which is what a script
 * that emits HTML from inside another script tag has to do. The browser sees
 * `<script src="https://cdn.jsdelivr.net/...">` either way, so an analysis
 * that reads the printed source instead of the string VALUE sees nothing here.
 */
export function injectAnalytics(document) {
  const markup =
    '\x3Cscript src="https://cdn.segment.com/analytics.js/v1/abc123/analytics.min.js" async>\x3C/script>';
  document.head.insertAdjacentHTML('beforeend', markup);
  return markup;
}
