/**
 * Typed analytics dispatcher for apps/docs.
 *
 * Vendor-neutral surface (ANALYTICS_PHILOSOPHY.md — `identify` / `track` /
 * `pageview`) backed by PostHog. Every call is guarded so analytics can
 * never break the UI:
 *
 * - DNT / GPC short-circuit at every call site.
 * - Missing env key = silent no-op (debug log in dev only).
 * - Dispatch goes to PostHog AND emits a `CustomEvent` on `window` so
 *   tests, dev-console inspectors, and a future Vercel Analytics
 *   forwarder can listen without re-implementing the catalogue.
 * - `track()` is generic over the typed `TrackedEventMap` — misspelled
 *   names fail the build.
 *
 * The event-name grammar is `category:object_action` with the fixed verb
 * list from ANALYTICS_PHILOSOPHY principle 4. The
 * `conventions/analytics-event-naming` ESLint rule enforces it; the
 * typed union here forces it for the docs surface specifically.
 */
import { posthog } from './posthog-init';

export interface TrackedEventMap {
  'articles:search_submit': { q: string; resultCount: number };
  'articles:filter_add': {
    tagsAdded: string[];
    tagsRemoved: string[];
    activeTags: string[];
    resultCount: number;
  };
  'articles:sort_update': {
    field: 'date' | 'reactions' | 'comments' | 'reading_time';
    direction: 'asc' | 'desc';
  };
  'articles:card_click': {
    articleId: number;
    position: number;
    isFeatured: boolean;
    sourceParams: string;
  };
  'articles:pagination_update': {
    from: number;
    to: number;
    totalPages: number;
  };
  'articles:subscribe_click': {
    channel: 'rss' | 'devto' | 'x' | 'github';
  };
  'articles:empty_state_view': { activeParams: string };
  // Homepage hero → GitHub star CTA. The npm→GitHub arrow is the widest leak
  // in the conversion funnel (GROWTH_PHILOSOPHY.md G1/G2); this measures it.
  'homepage:star_click': { stars: number | null };
  // Peak-value rule-page CTA (RuleValueCTA): the ask shown right after a rule
  // caught something. `follow` (Dev.to) and `star` (GitHub) tracked separately
  // so we can see which conversion the rule-page traffic actually takes.
  'rule_page:cta_click': { action: 'star' | 'follow'; plugin: string; rule: string };
  // Stats / scorecard page CTAs (star, install, docs links).
  'stats:cta_click': { action: 'star' | 'plugin_install' | 'plugin_docs'; plugin?: string };
  // Flagship / scorecard page CTAs.
  'flagship:cta_click': {
    action: 'star' | 'plugin_install' | 'rule_install' | 'rule_docs' | 'install_config';
    plugin?: string;
    rule?: string;
  };
}

export type TrackedEventName = keyof TrackedEventMap;

const CHANNEL = 'interlace:articles';

function isTrackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  const dnt = navigator.doNotTrack;
  if (dnt === '1' || dnt === 'yes') return false;
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl;
  if (gpc === true) return false;
  return true;
}

function safe<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Capture a typed event. The first arg is constrained to the
 * `TrackedEventMap` union — misspellings fail the build.
 */
export function track<E extends TrackedEventName>(
  event: E,
  payload: TrackedEventMap[E],
): void {
  if (!isTrackingAllowed()) return;
  safe(() => {
    window.dispatchEvent(
      new CustomEvent(CHANNEL, { detail: { event, payload } }),
    );
    posthog.capture?.(event, payload as Record<string, unknown>);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] track ${event}`, payload);
    }
  });
}

/**
 * Identify the current visitor with a canonical id (hashed email, etc.).
 * Person properties optionally merged via `$set`.
 */
export function identify(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  if (!isTrackingAllowed()) return;
  if (!distinctId) return;
  safe(() => {
    posthog.identify?.(distinctId, properties);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] identify ${distinctId}`, properties);
    }
  });
}

/**
 * Capture a `$pageview`. Defaults to the current URL when called without
 * args. Used by the App Router pageview tracker component.
 */
export function pageview(
  url?: string,
  properties?: Record<string, unknown>,
): void {
  if (!isTrackingAllowed()) return;
  safe(() => {
    const $current_url =
      url ?? (typeof window !== 'undefined' ? window.location.href : '');
    posthog.capture?.('$pageview', { $current_url, ...properties });
    if (process.env.NODE_ENV !== 'production') {
      // Pass the URL as a separate arg, not interpolated into the format
      // string: $current_url can derive from window.location.href (which
      // CodeQL treats as user-controlled), and a %-token in it would be read
      // as a console format specifier (js/tainted-format-string).
      // eslint-disable-next-line no-console
      console.debug('[analytics] pageview', $current_url, properties);
    }
  });
}
