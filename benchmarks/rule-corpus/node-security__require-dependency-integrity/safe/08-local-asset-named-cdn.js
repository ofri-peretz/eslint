/**
 * SAFE (adversarial) - same-origin, relative asset paths that happen to
 * contain the characters `cdn.` in a FILENAME or a query string. These files
 * are served by this application from its own origin; there is no third party
 * in the request. A report here would prove the host test is a substring
 * search over the whole tag rather than a look at where the bytes come from.
 */
export function offlineHead(build) {
  return `
    <script src="/assets/cdn.fallback.js" defer></script>
    <link rel="stylesheet" href="/css/cdn.overrides.css">
    <script src="/js/app.js?variant=cdn.disabled&build=${build}"></script>
  `;
}
