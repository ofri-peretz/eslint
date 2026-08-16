/**
 * VULNERABLE (adversarial) - a CDN fallback handler written before the `src`
 * attribute, whose expression contains a `>`. HTML ends the tag at the first
 * `>` OUTSIDE a quoted attribute value, so this is one tag with an unprotected
 * CDN `src`; any scan that stops at the first `>` anywhere splits it in two
 * and never sees the `src` at all.
 */
export function resilientHead() {
  return `
    <script onerror="if (window.__cdnRetries > 0) { window.__cdnFallback(); }" src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
    <link onerror="if (retries > 0) reloadCss()" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
  `;
}
