/**
 * Canonical site configuration — single source of truth for the production
 * domain and related identifiers.
 *
 * **Why this file exists.** Before 2026-05-10, `https://eslint.interlace.tools`
 * was hardcoded in 5 places (layout `metadataBase` + OG `url`, the per-doc
 * canonical URL in `[[...slug]]/page.tsx`, and 3 JSON Schema `$id` files).
 * A separate cluster of files used the *wrong* domain `interlace.dev` —
 * legacy reflex from when the brand lived on a different apex. The
 * Wave 8 cleanup fixed the prose; this file prevents future drift in code.
 *
 * **The contract.** Anywhere that needs to refer to the site's own canonical
 * origin (metadata, sitemaps, OG tags, structured data) imports `SITE_ORIGIN`.
 * The drift validator (in the baseline) flags any `https://*.interlace.{dev,tools}`
 * URL in MDX content that is neither this origin nor an explicitly allowlisted
 * sibling site (`interlace.tools` apex, `serverless.interlace.tools`, etc.).
 *
 * Renaming the domain: change `SITE_ORIGIN` here, the metadata + canonical
 * URLs follow automatically.
 */

/** The production origin (scheme + host, no trailing slash). */
export const SITE_ORIGIN = 'https://eslint.interlace.tools' as const;

/** Sibling Interlace-line sites that may legitimately appear in prose. */
export const SIBLING_ORIGINS = [
  'https://interlace.tools', // brand apex / landing site
  'https://serverless.interlace.tools', // sister product
] as const;

/** Build a canonical absolute URL for a docs page path. */
export function canonicalDocsUrl(slugPath: string): string {
  const trimmed = slugPath.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${SITE_ORIGIN}/docs/${trimmed}` : `${SITE_ORIGIN}/docs`;
}
