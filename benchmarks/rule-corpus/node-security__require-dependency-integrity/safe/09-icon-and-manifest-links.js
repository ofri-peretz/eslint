/**
 * SAFE (adversarial) - `<link>` relations that SRI does not cover. The spec
 * defines integrity metadata for script and style destinations only; a
 * browser ignores `integrity` on an icon, a manifest, an alternate feed or a
 * canonical URL. Demanding a hash on these asks for markup no browser checks.
 */
export function metaHead(origin) {
  return `
    <link rel="icon" href="https://cdn.example.com/brand/favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="https://cdn.example.com/brand/touch-icon.png">
    <link rel="manifest" href="https://cdn.example.com/app.webmanifest">
    <link rel="canonical" href="${origin}/pricing">
    <link rel="alternate" type="application/rss+xml" href="https://cdn.example.com/feed.xml">
  `;
}
