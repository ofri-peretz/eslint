/**
 * UTM helpers for apps/docs.
 *
 * Mirrors the contract in UTM_PHILOSOPHY.md:
 * - Fixed source/medium taxonomy (typed unions; values match the table).
 * - `buildUtmHref()` is the only blessed builder; the
 *   `conventions/no-raw-cross-property-href` ESLint rule enforces.
 * - `consumeLandingUtm()` reads `utm_*` (and `ph_distinct_id`) from the
 *   current URL, returns the parsed values for the caller to feed into
 *   `$set_once` person properties, then strips them from the address bar
 *   via `replaceState` so re-shares don't re-stamp source.
 *
 * Duplicated per property by design (no shared package) — keep this in
 * sync with the other properties' lib/utm.ts when extending.
 */
import { posthog } from './posthog-init';

export type UtmSource =
  | 'ofriperetz_dev'
  | 'interlace'
  | 'eslint_docs'
  | 'serverless_docs'
  | 'ds'
  | 'storybook'
  | 'dev_to'
  | 'github'
  | 'npm'
  | 'x'
  | 'linkedin'
  | 'email';

export type UtmMedium =
  | 'blog'
  | 'docs'
  | 'landing'
  | 'social'
  | 'email'
  | 'referral'
  | 'cli';

export interface UtmOptions {
  source: UtmSource;
  medium: UtmMedium;
  /** Slug derived from the content piece. Not free-form time windows. */
  campaign?: string;
  /** Slug naming the placement on the source page. */
  content?: string;
  /** Free-form, optional (paid search). */
  term?: string;
}

/** Cross-property hosts on a different eTLD+1 from `*.interlace.tools`. */
const CROSS_ETLD_HOSTS = new Set(['ofriperetz.dev']);

function isCrossEtldOutbound(host: string): boolean {
  // Cookie carries identity within `.interlace.tools`. Outside of it, we
  // hand off via `ph_distinct_id` query param (ANALYTICS_PHILOSOPHY #8).
  return CROSS_ETLD_HOSTS.has(host);
}

/**
 * Construct a cross-property URL with UTM and (when crossing eTLD+1)
 * a `ph_distinct_id` hand-off for identity stitching.
 *
 * The helper is safe in SSR (no `window`); when there's no posthog
 * instance available, the `ph_distinct_id` step is skipped.
 */
export function buildUtmHref(href: string, opts: UtmOptions): string {
  try {
    const url = new URL(href);
    url.searchParams.set('utm_source', opts.source);
    url.searchParams.set('utm_medium', opts.medium);
    if (opts.campaign) url.searchParams.set('utm_campaign', opts.campaign);
    if (opts.content) url.searchParams.set('utm_content', opts.content);
    if (opts.term) url.searchParams.set('utm_term', opts.term);

    if (
      typeof window !== 'undefined' &&
      isCrossEtldOutbound(url.hostname.toLowerCase())
    ) {
      try {
        const id = posthog.get_distinct_id?.();
        if (id) url.searchParams.set('ph_distinct_id', id);
      } catch {
        // posthog not initialised — proceed without hand-off.
      }
    }
    return url.toString();
  } catch {
    // Malformed href — return as-is rather than crash callers.
    return href;
  }
}

export interface LandingUtm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  phDistinctId: string | null;
  referrer: string | null;
}

/**
 * Read `utm_*` + `ph_distinct_id` from the current URL, return parsed
 * values, and strip them from the address bar via `replaceState`. Hash
 * and other params survive. Safe to call multiple times — second call
 * returns all-nulls.
 */
export function consumeLandingUtm(): LandingUtm {
  if (typeof window === 'undefined') {
    return {
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null,
      phDistinctId: null,
      referrer: null,
    };
  }
  try {
    const u = new URL(window.location.href);
    const result: LandingUtm = {
      source: u.searchParams.get('utm_source'),
      medium: u.searchParams.get('utm_medium'),
      campaign: u.searchParams.get('utm_campaign'),
      content: u.searchParams.get('utm_content'),
      term: u.searchParams.get('utm_term'),
      phDistinctId: u.searchParams.get('ph_distinct_id'),
      referrer: document.referrer || null,
    };
    const anyStripped =
      result.source ||
      result.medium ||
      result.campaign ||
      result.content ||
      result.term ||
      result.phDistinctId;
    if (!anyStripped) return result;
    for (const k of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'ph_distinct_id',
    ]) {
      u.searchParams.delete(k);
    }
    const clean = u.pathname + (u.search || '') + (u.hash || '');
    window.history.replaceState(window.history.state, '', clean);
    return result;
  } catch {
    return {
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null,
      phDistinctId: null,
      referrer: null,
    };
  }
}

/**
 * Loose UUID-ish check — accept the kind of token PostHog mints
 * (`019…` style with hyphens or alphanumeric ~20+ chars). Reject empty,
 * URL-encoded garbage, or anything with HTML/script characters.
 */
export function isPlausibleDistinctId(id: string | null): id is string {
  if (!id) return false;
  if (id.length < 8 || id.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}
