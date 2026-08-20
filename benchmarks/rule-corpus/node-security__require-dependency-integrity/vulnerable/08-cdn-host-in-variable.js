/**
 * VULNERABLE (adversarial) - the CDN host reaches the tag through a `const`.
 * Hoisting a base URL to a module constant is how every real template writes
 * this; the emitted markup is byte-for-byte fixture 01, and still unprotected.
 * Nothing in this file is safer than fixture 01 - only less quotable.
 */
const CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const CHART_VERSION = '4.4.1';

export function dashboardHead(title) {
  return `
    <title>${title}</title>
    <script src="${CDN_BASE}/chart.js@${CHART_VERSION}/dist/chart.umd.js"></script>
    <link rel="stylesheet" href="${CDN_BASE}/@picocss/pico@2/css/pico.min.css">
  `;
}
