/**
 * Canonical UTM taxonomy for build-time scripts.
 *
 * Used by the README link stamper, the package-homepage repointer, the social
 * link generator, and the UTM regression lock. Mirrors the value sets in
 * packages/eslint-plugin-conventions/src/rules/conventions/utm-taxonomy.ts and
 * the table in UTM_PHILOSOPHY.md — when a value changes, edit all three.
 * Duplication is intentional (no cross-repo versioning); see UTM_PHILOSOPHY.md
 * principle "buildUtmHref() is the only blessed builder".
 */

export const VALID_UTM_SOURCES = new Set([
  'ofriperetz_dev',
  'interlace',
  'eslint_docs',
  'serverless_docs',
  'ds',
  'storybook',
  'dev_to',
  'github',
  'npm',
  'x',
  'linkedin',
  'email',
]);

export const VALID_UTM_MEDIUMS = new Set([
  'blog',
  'docs',
  'landing',
  'social',
  'email',
  'referral',
  'cli',
]);

export interface UtmParams {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
}

/**
 * Append validated utm_* params to an absolute URL. Existing utm_* params are
 * overwritten; other query params and the hash are preserved. Throws on a
 * source/medium outside the fixed taxonomy so a typo fails the build instead
 * of shipping an un-attributable link.
 */
export function buildUtmHref(href: string, utm: UtmParams): string {
  if (!VALID_UTM_SOURCES.has(utm.source)) {
    throw new Error(
      `Invalid utm_source "${utm.source}". Allowed: ${[...VALID_UTM_SOURCES].join(', ')}`,
    );
  }
  if (!VALID_UTM_MEDIUMS.has(utm.medium)) {
    throw new Error(
      `Invalid utm_medium "${utm.medium}". Allowed: ${[...VALID_UTM_MEDIUMS].join(', ')}`,
    );
  }
  const url = new URL(href);
  url.searchParams.set('utm_source', utm.source);
  url.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
  if (utm.content) url.searchParams.set('utm_content', utm.content);
  return url.toString();
}

// Hosts we own. Links to these in published content (READMEs, package
// metadata, articles) carry inbound attribution; links anywhere else do not.
const OWNED_HOST_RE =
  /^https?:\/\/(?:[a-z0-9-]+\.)*(?:interlace\.tools|ofriperetz\.dev)(?:[/?#]|$)/i;

// Asset URLs (logos, screenshots, stylesheets) must NOT be stamped: a UTM on
// an <img src> is meaningless and, on GitHub, breaks camo image proxying.
const ASSET_EXT_RE =
  /\.(?:svg|png|jpe?g|gif|webp|avif|ico|css|js|mjs|cjs|json|txt|xml|rss|woff2?|ttf|map)(?:[?#]|$)/i;

/** A link to one of our properties that should carry inbound UTMs. */
export function isOwnedContentLink(href: string): boolean {
  return OWNED_HOST_RE.test(href) && !ASSET_EXT_RE.test(href);
}

/** True if the URL already carries a utm_source param. */
export function hasUtm(href: string): boolean {
  return /[?&]utm_source=/.test(href);
}
