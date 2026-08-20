/**
 * VULNERABLE - a partial mitigation. `crossorigin="anonymous"` is the
 * attribute SRI REQUIRES alongside a hash, so its presence reads as
 * "we thought about this" - but on its own it only changes how credentials are
 * sent. Nothing verifies the bytes.
 */
const CDN = 'https://cdn.jsdelivr.net/npm';

export function widgetEmbed(id) {
  return `
    <div data-widget="${id}"></div>
    <script src="${CDN}/@acme/widget@2.1.0/dist/widget.js" crossorigin="anonymous" async></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@acme/widget@2.1.0/dist/widget.css" crossorigin="anonymous">
  `;
}
