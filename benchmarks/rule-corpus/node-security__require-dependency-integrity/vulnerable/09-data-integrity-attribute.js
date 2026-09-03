/**
 * VULNERABLE (adversarial) - a half-finished migration. The asset pipeline
 * stamps its own bookkeeping attribute, `data-integrity`, but never emits the
 * real `integrity` attribute the browser reads. The tag therefore contains the
 * text "integrity=" and verifies nothing: the browser ignores unknown `data-`
 * attributes entirely.
 */
export function vendorHead(manifest) {
  return `
    <script
      src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"
      data-integrity="${manifest.dayjs}"
    ></script>
    <link
      rel="stylesheet"
      href="https://unpkg.com/normalize.css@8.0.1/normalize.css"
      data-integrity="${manifest.normalize}"
    >
  `;
}
